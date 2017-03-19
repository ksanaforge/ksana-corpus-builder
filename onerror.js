var lasterrorfilename="",lasterrorline=0;
const printtagstack=function(){
	const stack=this.tagstack.map(function(T){
		return T.tag.name+"#"+(T.line+1);
	});

	return stack.join("/");
}
const onerror=function(){
	const filename=this.filename;
	var message=filename;
	try {
		message=require("path").resolve(filename)
	} catch(e){
		//fn=corpus.filename;
	}
	if (message[0]=='/') message=message.substr(1);

	var errormessage=this.error.message.replace(/\n/g," ");
	var errorline=0;
	errormessage=errormessage.replace(/(Line: )(\d+) /,function(m,t,l){
		errorline=parseInt(l,10);
		if (isNaN(errorline))return t+l;
		return "";
	});

	if (lasterrorfilename==filename&&lasterrorline==errorline) {
		//only report first error for same line
		return;
	}		

	this.log(message+"("+(errorline+1)+"): "+errormessage
		+(errormessage.indexOf("close tag")>0
		?"  "+printtagstack.call(this):""));
	lasterrorfilename=filename;
	lasterrorline=errorline;
}
module.exports=onerror;