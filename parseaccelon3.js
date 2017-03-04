/*
	convert accelon3 format
*/
const sax="sax";
const fs=require("fs");
const format=require("./accelon3handler/format");
const note=require("./accelon3handler/note");
const a3Tree=require("./accelon3handler/tree");
const encodeSubtreeItem=require("./subtree").encodeSubtreeItem;
var parser,log=console.log;

var defaultopenhandlers={"段":format.p,p:format.p,
	"頁":format.pb,"註":note.ptr,"釋":note.def};
const defaultclosehandlers={"釋":note.def};
const setHandlers=function(corpus,openhandlers,closehandlers,otherhandlers){
	corpus.openhandlers=Object.assign(corpus.openhandlers,openhandlers,defaultopenhandlers);
	corpus.closehandlers=Object.assign(corpus.closehandlers,closehandlers,defaultclosehandlers);	
	corpus.otherhandlers=Object.assign(corpus.otherhandlers,otherhandlers);
}
var tocobj=null;

const addContent=function(content,name,opts){
	const corpus=this;
	opts=opts||{};
	const Sax=require("sax");
	parser = Sax.parser(true);
	var tagstack=[];
	var subtreeitems=[], subtreekpos=0;
	corpus.content=content;

	const addLines=function(s){

		if( s=="\n" && this._pbline==0) return;//ignore crlf after <pb>
		var kpos;
		const lines=s.trim().split("\n");
		for (var i=0;i<lines.length;i++) {
			kpos=this.makeKPos(this.bookCount,this._pb-1,this._pbline+i,0);
			if (kpos==-1) {
				log("error","error kpos "+this.bookCount+" "+this._pb-1+" "+this._pbline+i);
			}
			try{
				this.newLine(kpos, this.tPos);
			} catch(e) {
				log("error",e)
			}
			this.putLine(lines[i]);
		}
		this._pbline+=lines.length;

		if (this._pbline<this.addressPattern.maxline){
			kpos=this.makeKPos(this.bookCount,this._pb-1,this._pbline,0);
			this.setPos(kpos,this.tPos);			
		}
	}

	parser.ontext=function(t){
		if (!t||t=="undefined")return;

		if (t.indexOf("\n")==-1) {
			corpus.addText(t);	
		} else {
			var text=corpus.popBaseText(t);
			text+=t;
			addLines.call(corpus,text);
		}
		
		if (tocobj) tocobj.text+=t;
	}
	parser.onopentag=function(tag){
		var capturing=false,subtree=0;
		tagstack.push({tag:tag,kpos:corpus.kPos,tpos:corpus.tPos});
		const handler=corpus.openhandlers[tag.name];
		const treetag=a3Tree.call(corpus,tag,parser);
		
		const depth=treetag.indexOf(tag.name);

		if (depth>-1) {
			if(tocobj)throw "nested Toc "+tag.name+" line:"+parser.line;
			if (opts.subtoc) {
				const subtreerootdepth=treetag.indexOf(opts.subtoc);
				subtree=depth>subtreerootdepth?subtreerootdepth:0;
			}
			tocobj={tag:tag.name,kpos:corpus.kPos,text:"",depth:depth,subtree:subtree};
		} 
		if (handler&&handler.call(corpus,tag)) {
			capturing=true;
		} else if (corpus.otherhandlers.onopentag) {
			capturing=corpus.otherhandlers.onopentag.call(corpus,tag,false,kpos,tpos);
		}

		if (capturing){
			corpus.textstack.push("");
			if (corpus.textstack.length>opts.maxTextStackDepth) {
				throw "nested text too depth (2)"+tag.name
				+JSON.stringify(tag.attributes)+corpus.textstack;
			}			
		}
	}

	parser.onclosetag=function(tagname){
		const t=tagstack.pop();
		const tag=t.tag, kpos=t.kpos,tpos=t.tpos;
		const handler=corpus.closehandlers[tagname];

		if (tocobj && tagname==tocobj.tag){
			if (tocobj.subtree){ //is a subtree
				const d=tocobj.depth-(tocobj.subtree||0);
				const len=corpus.kcount(tocobj.text);
				corpus.putArticleField("head",d,corpus.makeRange(kpos,kpos+len));
				corpus.putEmptyArticleField("p",kpos);
				subtreeitems.push(encodeSubtreeItem(tocobj));
			} else {
				corpus.putField("toc",tocobj.depth+"\t"+tocobj.text,tocobj.kpos);	
				if (subtreeitems.length){
					corpus.putField("subtoc",subtreeitems,subtreekpos);
					corpus.putField("subtoc_range",corpus.kPos,subtreekpos);
					subtreeitems=[];
				}
				subtreekpos=tocobj.kpos;
			}
			tocobj=null;
		}
		
		//corpus.kPos;
		if (handler) {
			handler.call(corpus,tag,true,kpos,tpos);
		} else if (corpus.otherhandlers.onclosetag) {
			corpus.otherhandlers.onclosetag.call(corpus,tag,true,kpos,tpos);
		}
	}	
	const finalize=function(){
		if(subtreeitems.length) {
			corpus.putField("subtoc",subtreeitems,subtreekpos);
			corpus.putField("subtoc_range",corpus.kPos,subtreekpos);
		}
	}

	parser.write(content);
	finalize();
}
const setLog=function(_log){
	log=_log;
}
const addFile=function(fn,opts){
	const corpus=this;
	const encoding=opts.encoding||"utf8";
	var content=fs.readFileSync(fn,encoding).replace(/\r?\n/g,"\n").trim();
	corpus.filename=fn;
	addContent.call(this,content,fn,opts);
}
const line=function(){
	return parser.line;
}
const initialize=function(corpus,opts){
	if (!opts.schema)return;
	const schema=opts.schema;
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

module.exports={addFile:addFile,addContent:addContent,
	setLog:setLog,initialize:initialize,
	setHandlers:setHandlers,line:line};