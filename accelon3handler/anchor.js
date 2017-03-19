const addAnchor=function(name){
	this.putField("anchor",name);
}

const a=function(tag,closing){
	const name=tag.attributes.name||tag.attributes.n;
	addAnchor.call(this,name);
	
}
module.exports={a:a,addAnchor:addAnchor};