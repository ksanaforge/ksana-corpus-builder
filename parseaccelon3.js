/*
	convert accelon3 format
*/
const sax="sax";
const fs=require("fs");
const format=require("./accelon3handler/format");
const note=require("./accelon3handler/note");
const a3Tree=require("./accelon3handler/tree");
const encodeSubtreeItem=require("./subtree").encodeSubtreeItem;
var parser;

var defaultopenhandlers={段:format.p,p:format.p,
	頁:format.pb,註:note.ptr,釋:note.def};
const defaultclosehandlers={釋:note.def};
const setHandlers=function(openhandlers,closehandlers,otherhandlers){

	this.openhandlers=Object.assign(openhandlers||{},defaultopenhandlers);	
	this.closehandlers=Object.assign(closehandlers||{},defaultclosehandlers);	
	this.otherhandlers=otherhandlers||{};
}
var tocobj=null;
const addContent=function(content,name,opts){
	opts=opts||{};
	const Sax=require("sax");
	parser = Sax.parser(true);
	var tagstack=[];
	var subtreeitems=[], prevtreekpos=0;
	var corpus=this;
	corpus.content=content;
	

	if (opts.article && !this.openhandlers[opts.article]) {
		this.openhandlers[opts.article]=format.article;
		this.closehandlers[opts.article]=format.article;
	}

	parser.ontext=function(t){
		if (!t||t=="undefined")return;
		corpus.addText(t);
		if (tocobj) tocobj.text+=t;
	}
	parser.onopentag=function(tag){
		var capturing=false,subtree=0;
		tagstack.push(tag);
		const handler=corpus.openhandlers[tag.name];
		const treetag=a3Tree.call(this,tag,parser);
	
		const depth=treetag.indexOf(tag.name);

		if (depth>-1) {
			if(tocobj)throw "nested Toc "+tag.name+" line:"+parser.line;
			if (opts.subtoc) {
				const subtreerootdepth=treetag.indexOf(opts.subtoc);
				subtree=depth>subtreerootdepth?subtreerootdepth:0;
			}
			tocobj={tag:tag.name,kpos:corpus.kPos,text:"",depth,subtree};
		} 
		if (handler&&handler.call(corpus,tag)) {
			capturing=true;
		} else if (corpus.otherhandlers.onopentag) {
			capturing=corpus.otherhandlers.onopentag.call(corpus,tag);
		}

		if (capturing){
			corpus.textstack.push("");
			if (corpus.textstack.length>2) {
				throw "nested text too depth (2)"+tag.name
				+JSON.stringify(tag.attributes)+corpus.textstack;
			}			
		}
	}

	parser.onclosetag=function(tagname){
		var tag=tagstack.pop();
		const handler=corpus.closehandlers[tagname];

		if (tocobj && tagname==tocobj.tag){
			if (tocobj.subtree){
				subtreeitems.push(encodeSubtreeItem(tocobj));
			} else {
				corpus.putField("toc",tocobj.depth+"\t"+tocobj.text,tocobj.kpos);	
				if (subtreeitems.length){
					corpus.putField("articletoc",subtreeitems,prevtreekpos);
					subtreeitems=[];	
				}
				prevtreekpos=tocobj.kpos;
			}
			tocobj=null;
		}
		
		//corpus.kPos;
		if (handler) {
			handler.call(corpus,tag,true);
		} else if (corpus.otherhandlers.onclosetag) {
			corpus.otherhandlers.onclosetag.call(corpus,tag,true);
		}
	}	
	const finalize=function(){
		subtreeitems.length&&corpus.putField("subtree",subtreeitems,prevtreekpos);
	}

	parser.write(content);
	finalize();
}
const addFile=function(fn,opts){
	//remove bom
	const encoding=opts.encoding||"utf8";
	var content=fs.readFileSync(fn,encoding).replace(/\r?\n/).trim();
	this.filename=fn;
	addContent.call(this,content,fn,opts);
}
const line=function(){
	return parser.line;
}
module.exports={addFile,addContent,setHandlers};