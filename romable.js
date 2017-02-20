var Ksanapos=require("ksana-corpus/ksanapos");
var bsearch=require("ksana-corpus/bsearch");
const Romable=function(opts){
	opts=opts||{};
	var fields={},afields={},texts=[];
	var token_postings={};
	var articlecount=0;

	var rom={texts:texts,fields:fields,afields:afields};
	const putField=function(name,value,kpos,storepoint){
		if (typeof storepoint!=="undefined") {
			if (!fields[name]) fields[name]={}; //storepoint as key
			if (!fields[name][storepoint]) {
				fields[name][storepoint]=[];
			}
			fields[name][storepoint].push([kpos,value]);
		} else {
			if (!fields[name]) fields[name]=[];
			fields[name].push([kpos,value]);
		}
	}
	const putArticle=function(value,kpos){
		articlecount++;
		articlepos=null;//invalidate build time articlepos
		putField("article",value,kpos);
	}

	var articlepos=null,articlename=null;

	const findArticle=function(range_address){
		var range=range_address;
		const pat=this.addressPattern;
		if (typeof range_address=="string") {
			range=Ksanapos.parse(range_address,pat);
		}
		const r=Ksanapos.breakRange(range,pat);
		if (!articlepos) {
			articlepos=[],articlename=[];
			fields.article.forEach(function(a){
				articlepos.push(a[0]);
				articlename.push(a[1]);
			});
		}
		var at=bsearch(articlepos,r.start+1,true)-1;
		return at;
	}

	const putAField=function(name,value,kpos,article){
		const a=article||articlecount-1;
		if (a<0)return;
		if (!afields[a]) {
			afields[a]={};
		}
		if (!afields[a][name]) {
			afields[a][name]=[];
		}
		afields[a][name].push([kpos,value]);
	}

	const getField=function(name,book){
		if (typeof book!=="undefined") {
			return fields[name][book];
		} else {
			return fields[name];	
		}
	}

	const getAField=function(article,name){
		if (typeof name!=="undefined"){
			return fields[article][name];	
		} else {
			return fields[article];
		}
	}

	const getAFields=function(article){
		return afields;
	}
	const putLine=function(line,kpos){
		var p=Ksanapos.unpack(kpos,this.addressPattern);
		const bk=p[0]-1,pg=p[1],ln=p[2];
		if (!texts[bk])texts[bk]=[];
		if (!texts[bk][pg])texts[bk][pg]=[];

		const thispage=p[1];
		var prevpage=thispage-1;
		while (prevpage>0 && !texts[bk][prevpage]) {
			texts[bk][prevpage--]=[" "]; //fill up the empty page with pseudo line
		}
		
		if (!line && !ln) line=" ";//first line cannot empty, array might have one item only, causing total len=0
		/*
		if (line && p[2] && texts[p[0]][p[1]][0]==" ") {
			texts[p[0]][p[1]][0]=" ";//set first line to empty if more than one item
		}
		*/
		var prev=ln-1;
		//prevent gap in array.
		while (prev>=0 && !texts[bk][pg][prev]) {
			texts[bk][pg][prev]=" ";
			prev--;
		}
		texts[bk][pg][ln]=line;
	}

	const getTexts=function(){
		return texts;
	}

	const invertAField=function(name,pos,value,inverttype){
		if (inverttype=="startend_unsorted") {
			putField(name+"_start", value[0],pos[0]);
			putField(name+"_end", value[value.length-1],pos[pos.length-1]);
		}
	}

	const finalizeAFields=function(){
		for (article in afields) {
			const afield=afields[article];

			for (name in afield) {
				const field=afield[name];
				var pos=[],value=[];

				hasvalue=field[0][1]!==null;
				field.sort(function(a,b){return a[0]===b[0]?(a[1]-b[1]):a[0]-b[0]}); //make sure kpos is in order

				for (j=0;j<field.length;j++){
					pos.push(field[j][0]);
					if (hasvalue) value.push(field[j][1]);
				}
				afield[name]={pos:pos};
				if (value.length) afield[name].value=value;

				if(opts.invertAField&&opts.invertAField[name]){
					invertAField(name,pos,value,opts.invertAField[name]);	
				}				
			}
		}
		return afields;
	}

//optimize for jsonrom
//convert to column base single item array
//kpos use vint and make use of stringarray
	const finalizeFields=function(){
		var i,j,k,f,hasvalue;
		for (i in fields) {
			var pos=[], value=[], field=fields[i];

			if (field instanceof Array) { 
				hasvalue=field[0][1]!==null;
				field.sort(function(a,b){return a[0]===b[0]?(a[1]-b[1]):a[0]-b[0]}); //make sure kpos is in order
				for (j=0;j<field.length;j++){
					pos.push(field[j][0]);
					if (hasvalue) value.push(field[j][1]);
				}
				fields[i]={pos:pos};
				if (value.length) fields[i].value=value;
			} else {
				for (k in field) {// per book field
					f=field[k]; pos=[],value=[];
					hasvalue=f[0][1]!==null;
					f.sort(function(a,b){
						return a[0]===b[0]?(a[1]-b[1]):a[0]-b[0];
					}); //make sure kpos and value is sorted,
					//sort value is kpos is the same
					for (j=0;j<f.length;j++){
						pos.push(f[j][0]);
						if (hasvalue) value.push(f[j][1]);
					}
					field[k]={pos:pos};
					if (value.length) field[k].value=value;
				}
			}
		}
		return fields;
	}


	const buildROM=function(meta,inverted){
		const afields=finalizeAFields();
		const fields=finalizeFields();
		const r={meta:meta,texts:texts};

		if (inverted){
			r.inverted=inverted.finalize();
		}
		if (Object.keys(fields).length) r.fields=fields;
		if (Object.keys(afields).length) r.afields=afields;
		return r;
	}

	return {putLine:putLine,
		putArticle:putArticle,
		putField:putField,putAField:putAField,
		getAField:getAField,getAFields:getAFields,
		getField:getField,buildROM:buildROM,findArticle:findArticle};
}
module.exports=Romable;