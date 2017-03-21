const acceptType={'jpeg':true,'png':true};

const img=function(tag,closing,kpos,tpos,start,end){
	var n=tag.attributes.n;
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
		var base64=this.opts.images[n];
		const m=base64.match&&base64.match(/data.+?base64,/);
		if (!m) {
			base64=new Buffer(base64).toString('base64');
		} else {
			base64=base64.substr(m[0].length);
		}
	} else {
		if (closing) this.log("warn","cannot find imagefile "+n);
		return
	}

	if (tag.isSelfClosing &&closing) {
		this.putArticleField(imagetype,base64);
		return;
	}


	if (closing) {
		const krange=this.makeRange(kpos,this.kPos);
		this.putArticleField(imagetype,base64,krange);
	}
}

module.exports=img;