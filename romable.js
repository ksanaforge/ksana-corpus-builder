const Ksanapos=require("ksana-corpus/ksanapos");
const bsearch=require("ksana-corpus/bsearch");
const importAFields=require("./externalmarkup").importAFields;
const importKFields=require("./externalmarkup").importKFields;
const importFields=require("./externalmarkup").importFields;
var log=console.log;
const Romable=function(opts){
	opts=opts||{};
	var gfields={},fields={},afields={},texts=[],kfields={};
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
	const putGField=function(name,value,kpos){
		if (!gfields[name]) gfields[name]=[];
		gfields[name].push([kpos,value]);
	}
	const putArticle=function(value,kpos){
		articlecount++;
		articlepos=null;//invalidate build time articlepos
		putGField("article",value,kpos);
	}

	const putKField=function(name,key,value,kpos){
		if (!kfields[name]) kfields[name]=[];
		kfields[name].push([key,value,kpos]);
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
			gfields.article.forEach(function(a){
				articlepos.push(a[0]);
				articlename.push(a[1]);
			});
		}
		var at=bsearch(articlepos,r.start+1,true)-1;
		return at;
	}

	const putAField=function(name,value,kpos,article){
		var a=article;
		if (!a && typeof a!=="number") a=articlecount-1;
		if (a<0)return;
		if (!afields[a]) {
			afields[a]={};
		}
		if (!afields[a][name]) {
			afields[a][name]=[];
		}
		const len=afields[a][name].length;
		if (len && afields[a][name][len-1][0]==kpos) {
			debugger
			log("warning same kpos, field "+name+" kpos "+Ksanapos.stringify(kpos,opts.addressPattern));
		} else {
			afields[a][name].push([kpos,value]);	
		}
	}

	const getField=function(name,book){
		if (typeof book!=="undefined") {
			return fields[name][book];
		} else {
			return fields[name];	
		}
	}
	const getGField=function(name){
		return fields[name];	
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
		while (prevpage>=0 && !texts[bk][prevpage]) {
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

	const finalizeTexts=function(){
		for (var i=0;i<texts.length;i++) {
			const booktexts=texts[i];
			if (!booktexts) {
				debugger;
				throw "empty book"+(i+1);
				continue;
			}
			for (var j=0;j<booktexts.length;j++) {
				const pagetexts=booktexts[j];
				while (pagetexts.length>1 && 
					pagetexts[pagetexts.length-1].trim()=="") {
					pagetexts.pop();
				}
			}
		}
		return texts;
	}
	const finalizeKFields=function(json){
		if (Object.keys(kfields).length==0) return null;
		const out={};
		for (var name in kfields) {
			const kfield=kfields[name];
			//sort by key
			kfield.sort(function(a,b){return (a[0]==b[0])?0:((a[0]>b[0])?1:-1)});
			var hasvalue=false;
			const key=[],value=[],kpos=[];
			for (var i=0;i<kfield.length;i++) {
				key.push(kfield[i][0]);
				if (kfield[i][1]) hasvalue=true;
				value.push(kfield[i][1]);
				kpos.push(kfield[i][2]);
			}
			out[name]={key:key,kpos:kpos};
			if (hasvalue) out[name].value=value;
		}

		var externalFields={};
		if (json) {
			externalFields=importKFields.call(this,json);
			for (var key in externalFields) {
				if (out[key]) {
					log("duplicate kfield",key);
				} else {
					out[key]=externalFields[key];
				}
			}			
		}
		return out;
	}

	const finalizeAFields=function(json){
		for (article in afields) {
			var afield=afields[article];
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
			}
		}
		var externalFields={};
		if (json) {
			externalFields=importAFields.call(this,json);
			for (var article in externalFields) {
				if (!afields[article]) afields[article]={};
				for (var field in externalFields[article]) {
					if (afields[article][field]) {
						log("duplicate afield",field);
					} else {
						afields[article][field]=externalFields[article][field];
					}
				}
			}
		}

		return afields;
	}

//optimize for jsonrom
//convert to column base single item array
//kpos use vint and make use of stringarray
	const finalizeFields=function(_fields,json){
		var i,j,k,f,hasvalue;
		for (i in _fields) {
			var pos=[], value=[], field=_fields[i];

			if (field instanceof Array) { 
				hasvalue=field[0][1]!==null;
				field.sort(function(a,b){return a[0]===b[0]?(a[1]-b[1]):a[0]-b[0]}); //make sure kpos is in order
				for (j=0;j<field.length;j++){
					pos.push(field[j][0]);
					if (hasvalue) value.push(field[j][1]);
				}
				_fields[i]={pos:pos};
				if (value.length) _fields[i].value=value;
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
		var externalFields={};
		if (json) {
			externalFields=importFields.call(this,json);
			for (var key in externalFields) {
				if (_fields[key]) {
					log("duplicate field",key);
				} else {
					_fields[key]=externalFields[key];
				}
			}
		}

		return _fields;
	}

	const buildROM=function(meta,inverted,external){
		const afields=finalizeAFields.call(this,external.afields);
		const _kfields=finalizeKFields.call(this,external.kfields);
		const _fields=finalizeFields.call(this,fields,external.fields);
		const _gfields=finalizeFields.call(this,gfields,external.gfields);
		const texts=finalizeTexts();
		const r={meta:meta,texts:texts};

		if (inverted){
			r.inverted=inverted.finalize();
		}
		if (_kfields&&Object.keys(kfields).length) r.kfields=_kfields;
		if (Object.keys(_fields).length) r.fields=_fields;
		r.gfields=_gfields;
		if (Object.keys(afields).length) r.afields=afields;

		if (!gfields.article) {
			throw "missing article"
		}
		if (inverted && !r.inverted.book2tpos) {
			throw "missing pb"	
		}
		return r;
	}
	const setLog=function(_log){
		log=_log;
	}

	return {putLine:putLine,
		putArticle:putArticle,
		addressPattern:opts.addressPattern,
		setLog:setLog,
		articleCount:function(){return articlecount},
		putField:putField,putAField:putAField,
		putGField:putGField,
		putKField:putKField,
		getAField:getAField,getAFields:getAFields,
		getField:getField,getGField:getGField,
		buildROM:buildROM,findArticle:findArticle};
}
module.exports=Romable;