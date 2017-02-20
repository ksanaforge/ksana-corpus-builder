const importExternalMarkup=function(json){
	const meta=json.shift();
	const fieldname=meta.type;
	for (var i=0;i<json.length;i++) {
		const parts=json[i].split("\t");
		const address=parts.shift();
		const r=this.parseRange(address);
		const kpos=r.start==r.end?r.start:r.range;
		const at=this.findArticle(kpos);
		if (at>=0) {
			this.putArticleField(fieldname,parts.join("\t"),kpos,at);
		}
	}
}
module.exports={importExternalMarkup};