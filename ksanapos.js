const parseAddress=function(b){
	const bookbits=b[0],pagebits=b[1],
	columnbits=b[2],linebits=b[3], charbits=b[4];
	if (charbits*2+linebits*2+columnbits*2+pagebits*2+bookbits>53) {
		throw "address has more than 53 bits";
	}
	const maxchar=1<<(charbits);
	const maxline=1<<(linebits);
	const maxcolumn=(columnbits==0)?0:(1<<columnbits);
	const maxpage=1<<(pagebits);
	const maxbook=1<<(bookbits);
	var rangebits=charbits+linebits+columnbits+pagebits;
	const maxrange=1<<(rangebits);
	const bits=[bookbits,pagebits,columnbits,linebits,charbits];
	return {maxbook,maxpage,maxcolumn,maxline,maxchar,maxrange,bits,
					bookbits,pagebits,columnbits,linebits,charbits,rangebits};
}
var checknums=function(nums,pat){
	if (nums[4]>pat.maxchar) {
		console.error(nums[4],"exceed maxchar",pat.maxchar)
		return 0;
	}
	if (nums[3]>pat.maxpage) {
		console.error(nums[3],"exceed maxpage",pat.maxpage)
		return 0;
	}
	if (nums[2]>pat.maxcolumn) {
		console.error(nums[2],"exceed maxcolumn",pat.maxcolumn)
		return 0;
	}
	if (nums[1]>pat.maxpage) {
		console.error(nums[1],"exceed maxpage",pat.maxpage)
		return 0;
	}
	if (nums[0]>pat.maxbook) {
		console.error(nums[0],"exceed maxbook",pat.maxbook)
		return 0;
	}
	return 1;
}
var makeKPos=function(nums,pat){
	var mul=1, kpos=0;

	if(!checknums(nums,pat))return 0;

	kpos=nums[4];       mul*=Math.pow(2,pat.charbits);
	kpos+= nums[3]*mul; mul*=Math.pow(2,pat.linebits);
	kpos+= nums[2]*mul; mul*=Math.pow(2,pat.columnbits);
	kpos+= nums[1]*mul; mul*=Math.pow(2,pat.pagebits);
	kpos+= nums[0]*mul;

	return kpos;
}
var unpack=function(kpos,pat){
	var ch=kpos%pat.maxchar;
	var line=Math.floor((kpos/pat.maxchar)%pat.maxline);
	var col=0;
	if (pat.maxcolumn) {
		col=Math.floor((kpos/ Math.pow(2,pat.charbits+pat.linebits)) %pat.maxcolumn);
	}
	var page=Math.floor((kpos/ Math.pow(2,pat.charbits+pat.linebits+pat.columnbits)) %pat.maxpage);
	var vol=Math.floor((kpos/Math.pow(2,pat.charbits+pat.linebits+pat.columnbits+pat.pagebits))%pat.maxbook);

	var r=[vol,page,col,line,ch];
	return r;
}
const stringify=function(kpos,pat){
	const parts=unpack(kpos,pat);
	var s= (parts[0]+1)+'p'+(1+parts[1]);
	if (pat.maxcolumn){
		console.log(pat.maxcolumn)
		s+=String.fromCharCode(parts[2]+0x61);
	} else {
		s+='.';
	}
	s+=(parts[3]+1);
	if (parts[4]) s='#'+(parts[4]+1);
	return s;
}
module.exports={parseAddress,makeKPos,unpack,stringify};