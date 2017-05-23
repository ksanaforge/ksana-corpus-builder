/*
	parse accelon3 format
*/
const format=require("./accelon3handler/format");
const note=require("./accelon3handler/note");
const a3Tree=require("./accelon3handler/tree");
const img=require("./accelon3handler/img");
const encodeTreeItem=require("./tree").encodeTreeItem;
const parsepre=require("./parsepre");

var defaultopenhandlers={"段":format.p,p:format.p,
	"頁":format.pb,"註":note.ptr,"釋":note.def,"圖":img};
const defaultclosehandlers={"釋":note.def,"圖":img};
var tocobj=null;
var subtree=0,treeitems=[],treekpos=0;
const addContent=function(content,name,opts){
	const corpus=this;
	onopentag=function(tag){
		if(tag.name == "類")
		{
			debugger
		}
		const treetag=a3Tree.call(corpus,tag);
		const depth=treetag.indexOf(tag.name);
		if (depth>-1) {
			if(tocobj)throw "nested Toc "+tag.name+" line:"+parser.line;
			if (opts.toc) {
				const treerootdepth=treetag.indexOf(opts.toc);
				subtree=depth>treerootdepth?treerootdepth:0;
			}
			tocobj={tag:tag.name,kpos:corpus.kPos,depth:depth,subtree:subtree};
		} 
	}
	onclosetag=function(T){
		if (tocobj && T.tag.name==tocobj.tag){
			const endposition=this.position-T.tag.name.length-3;
			tocobj.text=corpus.substring(T.position,endposition);
			if (tocobj.subtree){ //is a subtree
				const d=tocobj.depth-(tocobj.subtree||0);
				corpus.putArticleField("head",d,corpus.makeRange(T.kpos,corpus.kPos));
				corpus.putEmptyArticleField("p",T.kpos);
				treeitems.push(encodeTreeItem(tocobj));
			} else {
				if (treeitems.length){
					corpus.putField("toc",treeitems,treekpos);
					// 用 tocobj 才對, 上個目錄群組的終點應該是本標記首, 而不是尾, 參考parsepre.js
					//corpus.putField("tocrange",corpus.kPos,treekpos);
					corpus.putField("tocrange",tocobj.kpos,treekpos);
					treeitems=[];
				} 
				if (opts.toc==tocobj.tag) {
					tocobj.depth=0;
					treeitems.push(encodeTreeItem(tocobj));
				}
				treekpos=tocobj.kpos;
			}
			tocobj=null;
		}
	}	

	const newopts=Object.assign({},opts,{
		customHead:true,
		onopentag:onopentag,onclosetag:onclosetag,
	});
	parsepre.addContent.call(this,content,name,newopts);

/* 這段應該不需要
	if (treeitems.length){
		corpus.putField("toc",treeitems,treekpos);
		corpus.putField("tocrange",corpus.kPos,treekpos);
		treeitems=[];
	}	
*/
}

const finalize=function(corpus,opts){
	if (treeitems.length){
		corpus.putField("toc",treeitems,treekpos);
		corpus.putField("tocrange",corpus.kPos,treekpos);		
	}
}

const initialize=function(corpus,opts){
	parsepre.initialize(corpus,opts);
	corpus.openhandlers=defaultopenhandlers;
	corpus.closehandlers=defaultclosehandlers;
	const schema=opts.schema||{};
	if(schema.article) {
		corpus.openhandlers[schema.article]=format.article;
		corpus.closehandlers[schema.article]=format.article;
	}
	if(schema.category) {
		corpus.openhandlers[schema.category]=format.category;
		corpus.closehandlers[schema.category]=format.category;
	}
	if(schema.group) {
		corpus.openhandlers[schema.group]=format.group;
		corpus.closehandlers[schema.group]=format.group;
	}
}
const addFile=function(fn,opts){
	//remove bom
	const fs=require("fs");
	
	const encoding=opts.encoding||"utf8";
	var content=fs.readFileSync(fn,encoding);
	content=content.replace(/\r?\n/g,"\n").trim();
	this.filename=fn;
	addContent.call(this,content,fn,opts);
}

module.exports={addFile:addFile,addContent:addContent,
	setLog:parsepre.setLog,initialize:initialize,
	setHandlers:parsepre.setHandlers,finalize:finalize};