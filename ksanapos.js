const parseAddress=function(bits){
	const charbits=bits & 0xF;
	const linebits=(bits >> 4) &0xF;
	const columnbits=(bits >> 8) &0xF;
	const pagebits=(bits >> 12) &0xF;
	const bookbits=(bits >> 16) &0xF;
	if (charbits*2+linebits*2+columnbits*2+pagebits*2+bookbits>53) {
		throw "address has more than 53 bits";
	}
	const maxchar=1<<(charbits);
	const maxline=1<<(linebits);
	const maxcolumn=1<<(columnbits);
	const maxpage=1<<(pagebits);
	const maxbook=1<<(bookbits);
	return {maxbook,maxpage,maxcolumn,maxline,maxchar,
					bookbits,pagebits,columnbits,linebits,charbits};
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
module.exports={parseAddress,makeKPos};