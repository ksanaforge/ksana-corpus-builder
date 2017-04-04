const loadsvg=function(url) {
	var svgcontent="";
	if (this.opts.images && this.opts.images[url]) {
		svgcontent=this.opts.images[url];
		const m=svgcontent.match&&svgcontent.indexOf(/data.+,/)==0;//is Data URL?
		if (!m) {
			svgcontent=new Buffer(svgcontent).toString('utf8');
		} else {
			svgcontent=svgcontent.substr(m[0].length);
		}
	} else {
		const fn="svg/"+url;
		const fs=require("fs");
		if (fs.existsSync(fn)){
			svgcontent=fs.readFileSync(fn,"utf8");			
		}
	}
	svgcontent=svgcontent.replace(/[^ ]+?\.svg/,url);//make sure the name is same
	return svgcontent;
}
module.exports=loadsvg;