const fs=require("fs");
var setHandlers=function(openhandlers,closehandlers,otherhandlers){
	this.openhandlers=openhandlers||{};	
	this.closehandlers=closehandlers||{};
	this.otherhandlers=otherhandlers||{};
}

var addFile=function(fn){
	var content=fs.readFileSync(fn,"utf8").replace(/\r?\n/g,"\n");
	this.filename=fn;
	addContent.call(this,content,fn);
}
var addContent=function(content,name){
	var i=0,tag="",text="",c,kpos=0;
	content=this.otherhandlers.onContent?this.otherhandlers.onContent(content):content;
	while (i<content.length) {
		c=content[i];
		if (c==="^"||c==="~"||c==="@"||c==="#") {
			this.addText(text);
			text="";
			tag+=c;
			c=content[++i];
			while (i<content.length && ((c>="0" && c<="9")||c==".")||c=="\n") {
				tag+=c;
				c=content[++i];
			}
			this.otherhandlers.onTag?this.otherhandlers.onTag.call(this,tag):null;
			tag="";
		} else {
			if (c=="\n") { 
				const kpos=this.nextLine( this.kPos);
				this.newLine( kpos ,this.tPos);
				this.addText(text);
				text="";
			} else {
				text+=c;	
			}
			i++;
		}
	}
	this.addText(text);

	const linetext=this.popText();
	this.putLine(linetext);

}

module.exports={addFile,addContent,setHandlers};