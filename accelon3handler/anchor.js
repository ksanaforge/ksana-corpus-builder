const addAnchor=function(name){
	this.putGField("anchor",name);
}

const a=function(tag,closing){
	const name=tag.attributes.name||tag.attributes.n;
	if (name) addAnchor.call(this,name);
}
module.exports={a:a,addAnchor:addAnchor};