/*
	convert accelon3 format
*/
const format=require("./accelon3handler/format");
const note=require("./accelon3handler/note");
const a3Tree=require("./accelon3handler/tree");
const encodeTreeItem=require("./tree").encodeTreeItem;
const fs=require("fs");
const parsepre=require("./parsepre");

var defaultopenhandlers={"段":format.p,p:format.p,
	"頁":format.pb,"註":note.ptr,"釋":note.def};
const defaultclosehandlers={"釋":note.def};
var tocobj=null;
var subtree=0,treeitems=[],treekpos=0;
const addContent=function(content,name,opts){
	const corpus=this;
	onopentag=function(tag){
		const treetag=a3Tree.call(corpus,tag);
		const depth=treetag.indexOf(tag.name);
		if (depth>-1) {
			if(tocobj)throw "nested Toc "+tag.name+" line:"+parser.line;
			if (opts.subtoc) {
				const treerootdepth=treetag.indexOf(opts.subtoc);
				subtree=depth>treerootdepth?treerootdepth:0;
			}
			tocobj={tag:tag.name,kpos:corpus.kPos,text:"",depth:depth,subtree:subtree};
		} 
	}
	onclosetag=function(T){
		if (tocobj && T.tag.name==tocobj.tag){
			if (tocobj.subtree){ //is a subtree
				const d=tocobj.depth-(tocobj.subtree||0);
				corpus.putArticleField("head",d,corpus.makeRange(kpos,corpus.kpos));
				corpus.putEmptyArticleField("p",kpos);
				treeitems.push(encodeTreeItem(tocobj));
			} else {
				corpus.putField("toc",tocobj.depth+"\t"+tocobj.text,tocobj.kpos);
				if (treeitems.length){
					corpus.putField("toc",treeitems,treekpos);
					corpus.putField("tocrange",corpus.kPos,treekpos);
					treeitems=[];
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
}

const initialize=function(corpus,opts){
	parsepre.initialize(corpus,opts);
	corpus.openhandlers=defaultopenhandlers;
	corpus.closehandlers=defaultclosehandlers;
	if(opts.article) {
		corpus.openhandlers[opts.article]=format.article;
		corpus.closehandlers[opts.article]=format.article;
	}
	if(opts.category) {
		corpus.openhandlers[opts.category]=format.category;
		corpus.closehandlers[opts.category]=format.category;
	}
	if(opts.group) {
		corpus.openhandlers[opts.group]=format.group;
		corpus.closehandlers[opts.group]=format.group;
	}
}
const addFile=function(fn,opts){
	//remove bom
	const encoding=opts.encoding||"utf8";
	var content=fs.readFileSync(fn,encoding);
	content=content.replace(/\r?\n/g,"\n").trim();
	this.filename=fn;
	addContent.call(this,content,fn,opts);
}

module.exports={addFile:addFile,addContent:addContent,
	setLog:parsepre.setLog,initialize:initialize,
	setHandlers:parsepre.setHandlers};