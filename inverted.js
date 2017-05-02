const NormalizeDiacritics=require("ksana-corpus/diacritics").normalize;
const createInverted=function(opts){
	const putBookPos=function(booknum){
		book2tpos[booknum]=tPos;
		tPos+=1000;
	}

	//linepos array is 2 dimensional, book+page*col*line
	//core structure for TPos from/to KPos
	const putLinePos=function(kpos){
		const C=Math.pow(2,addressPattern.charbits);
		const R=Math.pow(2,addressPattern.rangebits);
		idx=Math.floor((kpos%R)/C);
		book=Math.floor(kpos/R) ; //book start from 1 and might have gap, use object

		if (!line2tpos[book]) {
			line2tpos[book]=[];
			if (idx!==0) {
				var gap=idx;
				while (gap>0) line2tpos[book][--gap]=tPos;
			}
		}

		line2tpos[book][idx]=tPos;
	}


	const posting=function(tk,tpos){
		if (!token_postings[tk]) token_postings[tk]=[];
		token_postings[tk].push(tpos);
	}

	const putToken=function(tk,type){
		if (type==TT.SPACE|| (type===TT.PUNC && removePunc)) {
			pTk=null;
			return;
		}
		if (type==TT.LATIN && typeof tk==="string") {
			tk=NormalizeDiacritics(tk);
		}
		if (type==TT.PUNC || type==TT.NUMBER) { //not indexed
			pTk=null;
			tPos++;
			return;
		}
		if (typeof tk==="string") {
			if (bigrams&&bigrams[pTk+tk]) {
				posting(pTk+tk,tPos-1);
				totalPosting++;
			}

			posting(tk,tPos);
			totalPosting++;
		} else {
			for (var j=0;j<tk.length;j++){ //onToken return an array
				if (bigrams[pTk+tk[j]]){
					totalPosting++;
					posting(pTk+tk[j],tPos-1);
				}
				posting(tk[j],tPos);	
				totalPosting++;
			}
		}
		tPos++;
		pTk=tk;
	}
	const putLine=function(s){
		throw "obsolete"
	}
	const putTokens=function(tokenized){
		for (i=0;i<tokenized.length;i++) {
			const type=tokenized[i][2];
			putToken(tokenized[i][0],type);
		};
	}

	const putArticle=function(tpos){
		tpos=tpos||tPos;
		article2tpos.push(tpos);
		tPos+=500;
	}

	const putGroup=function(tpos){
		tpos=tpos||tPos;
		group2tpos.push(tpos);
	}

	const finalize=function(){
		var arr=[],posting_length=[];
		for (var i in token_postings){
			arr.push([i,token_postings[i]]);
		}
		//sort token alphabetically
		arr.sort(function(a,b){return (a[0]==b[0])?0:((a[0]>b[0])?1:-1)});
		
		for (var j=0;j<arr.length;j++) {
			posting_length.push(arr[j][1].length);
		}
		var tokens=arr.map(function(item){return item[0]});
		var postings=arr.map(function(item){return item[1]});
		token_postings={};
		const r={tokens:tokens,postings:postings,article2tpos:article2tpos,
			line2tpos:line2tpos,book2tpos:book2tpos,posting_length:posting_length}
		if (group2tpos.length) r.group2tpos=group2tpos;
		return r;
	}

	const TT=opts.tokenizer.TokenTypes;
	var instance={},bigrams,removePunc;
	var token_postings={},line2tpos={},book2tpos=[],article2tpos=[];
	var group2tpos=[];
	var	pTk=null,tPos=1 ,totalPosting=0;

	//instance.putLine=putLine;
	bigrams=opts.bigrams||null;

	addressPattern=opts.addressPattern;
	instance.tokenizer=opts.tokenizer;
	instance.tPos=function(){return tPos};
	instance.totalPosting=function(){return totalPosting};
	instance.putBookPos=putBookPos;
	instance.putToken=putToken;
	instance.putTokens=putTokens;
	instance.putArticle=putArticle;
	instance.putGroup=putGroup;
	instance.finalize=finalize;
	instance.putLinePos=putLinePos;

	removePunc=!!opts.removePunc;
	return instance;
}
module.exports={createInverted:createInverted};