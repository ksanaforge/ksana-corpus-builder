const parsexml=require("./parsexml");
const ksanacount=require("./ksanacount");
const ksanapos=require("./ksanapos");
const createCorpus=function(name,opts){
	opts=opts||{};
	var kPos=0, LineKCount=0, tPos=0, text="";
	var filecount=0;
	var textstack=[""];
	var vars={};
	const addressPattern=ksanapos.parseAddress(opts.addrbits);

	const addFile=function(fn){
		parsexml.addFile.call(this,fn);
		filecount++;
	}
	const setHandlers=function(openhandlers,closehandlers){
		parsexml.setHandlers.call(this,openhandlers,closehandlers);
	}
	const onToken=function(){

	}
	const addXMLTextNode=function(t){
		if (textstack.length==1) {
			LineKCount+=this.kcount(t);
		}
		textstack[textstack.length-1]+=t;
	}
	const popText=function(){
		const s=textstack.pop();
		if (textstack.length==0) textstack.push("");//make sure text stack has at least one entry
		return s;
	}
	const makeKPos=function(book,page,column,line,character){
		return ksanapos.makeKPos([book,page,column,line,character],addressPattern);
	}

	const putLine=function(kpos,text){

	}

	const instance={addFile, onToken, vars, makeKPos};
	instance.kPos=()=>kPos;
	instance.fileCount=()=>filecount;


	if (opts.inputformat==="xml") {
		instance.setHandlers=setHandlers;
		instance.textstack=textstack;
		instance.popText=popText;
		instance.addText=addXMLTextNode;
		instance.putLine=putLine;
	}

	instance.kcount=ksanacount.cjk;
	if (opts.language==="classical_chinese") {
		instance.kcount=ksanacount.cjk_nopunc;
	}

	
	return instance;

}
module.exports={createCorpus};