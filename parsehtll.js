const fs=require("fs");
var log=console.log;

const handlers=require("./htll/handlers");
const tags=require("./htll/tags")
const tagType=tags.tagType;
const ARTICLE_START=tags.ARTICLE_START;

var addFile=function(fn,opts){
	console.log(fn)
	const encoding=opts.encoding||"utf8";
	var content=fs.readFileSync(fn,"utf8").replace(/\r?\n/g,"\n");
	this.filename=fn;
	addContent.call(this,content,fn,opts);
}
var linetext;

var addContent=function(content,name,opts){
	var textbuf="", linebuf="";
	const corpus=this;
	var kpos;
	const emittext=function(){
		if (!textbuf)return;
		const tokenized=corpus.tokenizer.tokenize(textbuf);
		for (var i=0;i<tokenized.length;i++) {
			const token=tokenized[i]
			if (token[0]!=="\n") {
				corpus.addToken(token);
			}else if (corpus._pb) {
				const _kpos=corpus.makeKPos(corpus.bookCount,corpus._pb-1,corpus._pbline+1,0);
				if (_kpos) {
					corpus.newLine(_kpos, corpus.tPos);
					corpus._pbline++;
					kpos=kpos;
				}
			}
		}
		tokens=[];
		textbuf="";
	}	
	var i=0,tag="",text="",c,kpos=0,linetext,tt;
	while (i<content.length) {
		c=content[i];
		tag="";

		if (tt=tagType(c)) {
			emittext();
			text="";
			tag+=c;
			c=content[++i];
			while (i<content.length && ((c>="0" && c<="9")||(c==".")||(c=="_")
				||(c=="-")||(c>="a"&&c<="z")||(c>='A'&&c<="Z"))
				) {
				tag+=c;
				c=content[++i];
			}
			if (tt==tags.TT_PB && c=="\n") i++;// crlf after pb is ignore
			handlers.addTag.call(this,tag);
		} else if (c===ARTICLE_START) {
			emittext();
			c=content[++i];
			var group=false;
			if (c==ARTICLE_START){
				group=true;
				c=content[++i];
			}
			while (i<content.length && c!=="\n") {
				tag+=c;
				c=content[++i];
			}
			if (c=="\n") i++;
			group?handlers.addGroup.call(this,tag):
				handlers.addArticle.call(this,tag);				
		} else {
			textbuf+=c;
			i++;
		}
	}
	emittext();
}
const line=function(){
	return linetext;
}
const setLog=function(_log){
	log=_log;
}
module.exports={addFile:addFile,addContent:addContent,
line:line,setLog:setLog};