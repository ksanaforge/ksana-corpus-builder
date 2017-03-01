const anchor=function(tag,closing){
	const name=tag.attributes.name||tag.attributes.n;
	this.putField("a",name);
}
module.exports={a:anchor};