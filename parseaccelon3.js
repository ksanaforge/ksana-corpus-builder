/*
	convert accelon3 format
*/
const sax="sax";
const fs=require("fs");
const format=require("./accelon3handler/format");
const note=require("./accelon3handler/note");
const prolog=require("./accelon3handler/prolog");
var defaultopenhandlers={段:format.p,p:format.p,
	頁:format.pb,註:note.ptr,釋:note.def};
const defaultclosehandlers={釋:note.def};
const setOptions=function(opts){
	if (opts.articleTag) {
		defaultopenhandlers[opts.articleTag]=format.article;
		defaultclosehandlers[opts.articleTag]=format.article;
	}
}
const setHandlers=function(openhandlers,closehandlers,otherhandlers){

	this.openhandlers=Object.assign(openhandlers||{},defaultopenhandlers);	
	this.closehandlers=Object.assign(closehandlers||{},defaultclosehandlers);	
	this.otherhandlers=otherhandlers||{};
}
const addContent=function(content,name){
	const Sax=require("sax");
	const parser = Sax.parser(true);
	var tagstack=[];
	
	var corpus=this;
	corpus.content=content;
	parser.ontext=function(t){
		if (!t||t=="undefined")return;
		corpus.addText(t);			
	}
	parser.onopentag=function(tag){
		tagstack.push(tag);
		const handler=corpus.openhandlers[tag.name];
		prolog.call(this,tag,parser);
		var capture=false;
		corpus.position=this.position;
		if (handler&&handler.call(corpus,tag)) {
			capture=true;
		} else if (corpus.otherhandlers.onopentag) {
			capture=corpus.otherhandlers.onopentag.call(corpus,tag);
		}
		if (capture){
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
		corpus.position=this.position;
		if (handler) {
			handler.call(corpus,tag,true);
		} else if (corpus.otherhandlers.onclosetag) {
			corpus.otherhandlers.onclosetag.call(corpus,tag,true);
		}
	}	
	parser.write(content);
}
const addFile=function(fn,encoding){
	//remove bom
	var content=fs.readFileSync(fn,encoding).replace(/\r?\n/).trim();
	this.filename=fn;
	addContent.call(this,content,fn);
}

module.exports={addFile,addContent,setHandlers,setOptions};