const getConfigJSON=function(filelist,cb){
	for (var i=0,f;f=filelist[i];i++) {
		if (f.name.indexOf("-corpus.json")>0) {
			var reader=new FileReader();
			var name=this.filename=f.name;
			reader.onload=function(e){
				try {
					const json=JSON.parse(e.target.result);
					cb(0,json);
				} catch(e){
					cb(f.name+" "+e.message);
				}
			}
			reader.readAsText(f,"UTF-8");	
			return;
		}
	}
	cb&&cb("Missing corpus configuration json.",null);
}
const isDataJSON=function(name){
	return name.match(/\.json$/) && !name.match(/-corpus.json$/);
}
const isImageFile=function(name){
	return name.match(/\.jpg/) || name.match(/\.png/)
	||name.match(/\.jepg/);
}

const prepareHTMLFile=function(files,cb){
	getConfigJSON.call(this,files,function(err,json){
		if (err) {
			cb(err);
			return;
		}
		const filenameat=[],out=[];
		for (var i=0,f;f=files[i];i++) {
			filenameat.push([f.name,i]);
		}
		//json should comes first
		filenameat.sort(function(a,b){return a[0]>b[0]?1:(a[0]<b[0]?-1:0)});
		const filenames=filenameat.map(function(a){return a[0]});
		const fileat=filenameat.map(function(a){return a[1]});
		if (!json.files) { //use all file in the folder
			for (var i=0;i<fileat.length;i++) {
				out.push( files[fileat[i]]);
			}
		} else { //json specified file list
			for (var i=0, f;f=json.files[i];i++) {
				const at=filenames.indexOf(f);
				if (at>-1) {
					out.push(files[fileat[at]]);
				} else {
					cb("file "+f+" not found in folder");
					return;
				}
			}
			const xmlfiles=out.map(function(f){return f.name});
			//add data json
			
			for (var i=0;i<filenames.length;i++) {
				const fn=filenames[i];
				if (isDataJSON(fn) || isImageFile(fn)) {
					if (xmlfiles.indexOf(fn)==-1) {
						const at=filenames.indexOf(fn);
						out.unshift(files[fileat[at]]);
					}
				}
			}
		}
		cb(0,out,json);
	})
}
const setExternal=function(externals,name,jsonstr){
	if (!externals) {
		this.log("error","external fields not specified in -corpus json");
		return;
	}
	try {
		const json=JSON.parse(jsonstr);
		for (var i in externals ) {
			if (externals[i]==name) {
				externals[i]=json;
			}
		}
	} catch(e) {
		this.log("error",e.message);
	}
}
const setImage=function(images,name,str){
	if (images instanceof Array) {
		var img={};
		for (var i in images) {
			var fn=images[i];//remove folder name
			var at=fn.lastIndexOf("/");
			if (at>-1) fn=fn.substr(at+1);
			img[fn]=false;
		}
		images=img;
	}

	images[name]=str;

	return images;
}

const addBrowserFiles=function(filelist,cb){
	var remain=0;
	var filecount=0,totalfilesize=0;
	var taskqueue=[];

	const addContent=function(content,fn,opts){
		this.onFileStart&&this.onFileStart.call(this,fn,filecount);
		this.parser.addContent.call(this,content,fn,opts);
		this.onFileEnd&&this.onFileEnd.call(this,fn,filecount);
		filecount++;
	}
	const me=this;
	if (!me.opts.images) me.opts.images={};
	for (var i=0, f ; f=filelist[i];i++){
		var filetype=null;

		if (f.type.match('text/')){
			filetype="text";
		} else if (isDataJSON(f.name)){
			filetype="json";
		} else if (f.name.indexOf(".png">0)||f.name.indexOf(".png">0)) {
			filetype='img';
		} else{
			continue;
		}
		remain++;
		var hasexternal=false;

		taskqueue.push((function(file,ft){
			return function(){
				if (file.empty) {
					tasks.shift();
					return;
				}
				var reader=new FileReader();
				var name=me.filename=file.name;
				reader.onload=(function(thefile,fn,options,type){
					return function(e){
						if (type=="text") {
							if (hasexternal && options.external) {
								if(me.parser.loadExternals){
									me.parser.loadExternals(me,options.external);
								}
								hasexternal=false;
							}
							content=e.target.result.replace(/\r?\n/g,"\n").trim();
							totalfilesize+=content.length;
							addContent.call(me,content,fn,options);
						} else if (type=="json"){
							if (options.external){
								hasexternal=true;
								setExternal.call(me,options.external,fn,e.target.result);
							}
						} else if (type=='img'){
							hasexternal=true;
							options.images=setImage.call(me,options.images,fn,e.target.result);
						}
						taskqueue.shift()();
					}
				})(file,name,me.opts,ft);

				if (ft=="img") {
					reader.readAsDataURL(file);
				} else {
					reader.readAsText(file,me.opts.encoding||"UTF-8");				
				}
			}
		})(f,filetype));
	}

	taskqueue.push(function(){
		setTimeout(function(){
			cb(0,me,totalfilesize);	
		},1);
	})
	taskqueue.shift()({__empty:true});		
}

module.exports={addBrowserFiles:addBrowserFiles,prepareHTMLFile:prepareHTMLFile};