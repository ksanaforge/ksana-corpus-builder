const acceptType={'jpeg':true,'png':true,'svg':true};
const img=function(tag,closing,kpos,tpos,start,end){
	if (!closing)return;

	var fullname=(this.opts.path||"")+(tag.attributes.n || tag.attributes.f);
	var n=tag.attributes.n || tag.attributes.f;
	var base64="";
	var at=n.lastIndexOf(".");
	var imagetype=n.substr(at+1);
	at=n.lastIndexOf("/");
	if (at>-1) n=n.substr(at+1);

	if (imagetype=="jpg") imagetype="jpeg";
	if (!acceptType[imagetype]) {
		this.log("warn","unsupported image type "+imagetype)
		return;
	}

	if (this.opts.images && this.opts.images[n]) {
		const Buffer=require("buffer/").Buffer;
		var base64=this.opts.images[n];
		const m=base64.match&&base64.match(/data.+?base64,/);
		if (!m) {
			if (imagetype=='svg') {
				base64=new Buffer(base64).toString('utf8');
			} else {
				base64=new Buffer(base64).toString('base64');
			}
		} else {
			base64=base64.substr(m[0].length);
		}
	} 

	if(!base64) {
		const fs=require("fs");
		if (fs&&fs.existsSync&&fs.existsSync(fullname)) {
			const f=fs.readFileSync(fullname);
			base64=new Buffer(f).toString('base64');
		}
	}

	if (!base64) {
		this.log("warn","cannot find imagefile "+fullname);
		return
	}
	var krange=this.makeRange(kpos-1,this.kPos);
	if (kpos==this.kPos) krange=kpos;
	this.putArticleField(imagetype,base64,krange);
}

module.exports=img;