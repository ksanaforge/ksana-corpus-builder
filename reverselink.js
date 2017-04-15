const BILINKSEP="<";
const add=function(corpus,kpos,tag,tagname){
	var targetcorpus=corpus.id;
	var to=tag.attributes.to;
	const m=to.match(/(.+)@(.+)/);
	if (m){
		targetcorpus=m[1];
		to=m[2];
	}
	//if to is a range, build reverse link
	const target=corpus.parseRange(to,targetcorpus!==corpus.id?targetcorpus:null);
	const fieldname=tag.name+BILINKSEP+targetcorpus;
	corpus.putGField(fieldname,target.range?target.range:to,
	corpus.makeRange(kpos,corpus.kPos));
	if (targetcorpus!==corpus.id) corpus.markBilink(fieldname);
}
/*
const transclude=function(tag,closing,kpos,tpos,start,end){	
	var from=tag.attributes.from;
	var targetcorpus=null;
	const m=from.match(/(.+)@(.+)/);
	if (m){
		targetcorpus=m[1];
		from=m[2];
		const range=this.parseRange(from,targetcorpus);
		if (range) {
			const fieldname="transclude@"+targetcorpus;
			this.putArticleField(fieldname,range.range);
			this.markBilink(fieldname);
		}
	}
}
*/
const importLinks=function(fieldname,bilinks,targetcorpus){
	var articles={};
	for (var i=0;i<bilinks.length;i++) {
		if (typeof bilinks[i]!=="string") continue;
		const bilink=bilinks[i].split("\t");
		var krange=this.parseRange(bilink[0]).range;
		var article=this.findArticle(krange);
		if (article<0) {
			this.log("ERROR","invalid address "+bilink[0]);
			continue;
		}
		articles[article]=true;
		var to=bilink[1];
		if (parseInt(to,10).toString(10)==to) {
			to=parseInt(to,10);
		}
		const r=this.parseRange(to,targetcorpus);
		if (r && r.range) {
			to=r.range; //convert to number form for faster reverse link
		}

		this.putGField(fieldname,to,krange);
	}
	//return array of Article containing bilinks
	return Object.keys(articles).map(function(i){ return parseInt(i,10)}).sort(function(a,b){return a-b});
}

module.exports={add:add,importLinks:importLinks,BILINKSEP:BILINKSEP};