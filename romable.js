var Ksanapos=require("ksana-corpus/ksanapos");

const Romable=function(opts){
	opts=opts||{};
	const buildInverted=opts.inverted;
	var fields={},afields={},texts=[],line2tpos={},book2tpos=[];
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
		putField("article",value,kpos);
	}
	const putAField=function(name,value,kpos){
		const a=articlecount-1;
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
	//linepos array is 2 dimensional, book+page*col*line
	//core structure for TPos from/to KPos
	const putLinePos=function(kpos,tpos){
		if (!buildInverted)return;

		const C=Math.pow(2,this.addressPattern.charbits);
		const R=Math.pow(2,this.addressPattern.rangebits);
		idx=Math.floor((kpos%R)/C);
		book=Math.floor(kpos/R) ; //book start from 1 and might have gap, use object

		if (!line2tpos[book]) line2tpos[book]=[];
		line2tpos[book][idx]=tpos;
	}

	const putBookPos=function(booknum,tpos){
		book2tpos[booknum]=tpos;
	}
	const getTexts=function(){
		return texts;
	}

	const finalizeLinePos=function(){
		return line2tpos;
	}

	const finalizeTokenPositings=function(){
		var arr=[];
		for (var i in token_postings){
			arr.push([i,token_postings[i]]);
		}
		//sort token alphabetically
		arr.sort(function(a,b){return (a[0]==b[0])?0:((a[0]>b[0])?1:-1)});
		
		var tokens=arr.map(function(item){return item[0]});
		var postings=arr.map(function(item){return item[1]});
		token_postings={};
		return {tokens:tokens,postings:postings};
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

	const putToken=function(tk,tpos){
		if (!buildInverted)return;
		if (!token_postings[tk]) token_postings[tk]=[];
		token_postings[tk].push(tpos);
	}

	const buildROM=function(meta){
		const afields=finalizeAFields();
		const fields=finalizeFields();
		const r={meta:meta,texts:texts};
		if (buildInverted){
			const line2tpos=finalizeLinePos();
			const f=finalizeTokenPositings();
			r.inverted={tokens:f.tokens,postings:f.postings,
				line2tpos:line2tpos,book2tpos:book2tpos};
		}
		if (Object.keys(fields).length) r.fields=fields;
		if (Object.keys(afields).length) r.afields=afields;
		return r;
	}

	return {putLine:putLine,putLinePos:putLinePos,putBookPos:putBookPos,
		putArticle:putArticle,
		putField:putField,putAField:putAField,
		getAField:getAField,getAFields:getAFields,
		getField:getField,putToken:putToken,buildROM:buildROM};
}
module.exports=Romable;