const parsexml=require("./parsexml");
const ksanacount=require("./ksanacount");
const ksanapos=require("./ksanapos");
const Romable=require("./romable");
const createCorpus=function(name,opts){
	opts=opts||{};
	var LineKStart=0, LineKCount=0, tPos=0, started=false;
	var filecount=0;
	var textstack=[""];
	var vars={};
	var romable=Romable();
	const addressPattern=ksanapos.parseAddress(opts.addrbits);

	const addFile=function(fn){
		parsexml.addFile.call(this,fn);
		filecount++;
	}
	const setHandlers=function(openhandlers,closehandlers,otherhandlers){
		parsexml.setHandlers.call(this,openhandlers,closehandlers,otherhandlers);
	}
	const onToken=function(){

	}
	const putField=function(name,value,kpos){
		kpos=kpos||this.kPos(); //default to current kpos
		romable.putField(name,value,kpos);
	}

	const addXMLTextNode=function(t){
		if (!started)return;
		if (textstack.length==1) {
			LineKCount+=this.kcount(t);
			if (LineKCount>addressPattern.maxchar) {
				console.error("line too long",t);
			}
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
	const makeKRange=function(startkpos,endkpos){
		var r=endkpos-startkpos;
		if (r>addressPattern.maxrange) {
			console.log("range too far",r);
			r=addressPattern.maxrange;
		}
		return startkpos*Math.pow(2,addressPattern.rangebits)+r;
	}

	const putLine=function(kpos,text){
		LineKStart=kpos;
		LineKCount=0;
	}
	var start=function(){
		started=true;
	}

	const instance={addFile, putField,onToken, vars, 
									makeKPos, makeKRange,	start, romable};
	instance.kPos=()=>(LineKStart+LineKCount);
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

	if(opts.autostart){
		started=true;
	}
	
	return instance;

}
module.exports={createCorpus};