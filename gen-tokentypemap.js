/* generate unicode to token type mapping */
/* input range 
   a 64K string, value from 0(0x30) to 0x7e
   each allowing up to 78 types.
*/
const {TokenTypes}=require("./TokenTypes");

const ranges=[
[[0x3400,0x4EFF],TokenTypes.CJK,"CJK Extension A"],
	[[0x4e00,0x9fff],TokenTypes.CJK,"CJK BMP"],
	[[0x3040,0x30ff],TokenTypes.CJK,"kana"],
	[[0x2e80,0x2eff],TokenTypes.CJK,"raidical"],
	[[0x2f00,0x2fdf],TokenTypes.CJK,"kangxi"],
	[[0xF900,0xFAFF],TokenTypes.CJK,"CJK compatibility"],
	[[0x3000,0x303F],TokenTypes.PUNC,"puncuation"],
	[[0xff01,0xff08,0xff09,0xff0c,0xff0e,0xff1a,0xff1b
	,0xff61,0xff64,0xff65],TokenTypes.PUNC,"full width puncuation"],
	[[0xF900,0xFAFF],TokenTypes.PUNC,"compatibility forms"],
	[[0x2FF0,0x2FFE],TokenTypes.IDC,"idc"],
	[[0xd800,0xd900],TokenTypes.SURROGATE,"SURRAGATE"],//android cannot process 0xF0000
	[[0x30,0x39],TokenTypes.NUMBER,"number"],
	[[0x41,0x5a],TokenTypes.LATIN,"latin capital"],
	[[0x61,0x7a],TokenTypes.LATIN,"latin small"],
	[[0x1e00,0x1eff],TokenTypes.LATIN,"latin extented additional"],
	[[0x100,0x17f],TokenTypes.LATIN,"latin extented"],
	[[0x100,0x17f],TokenTypes.LATIN,"latin extented"],
	[[0x3000],TokenTypes.SPACE,"full width space"],
	[[0xF90,0xFFF],TokenTypes.TIBETAN,"tibetan"],
	[[0x00,0x20],TokenTypes.SPACE,"space"],
	[[0x2c,0x2e,0x3a,0x3b,0x3f],TokenTypes.SPACE,"space"],
	[[0xf00,0xf19],TokenTypes.SPACE,"tibetan separator"],
	[[0xfc0,0xfff],TokenTypes.SPACE,"tibetan separator"]
];

var types=[],i;
for (i=0;i<65536;i++) types[i]= TokenTypes.SPACE;
for (i=0;i<ranges.length;i++){
	var r=ranges[i][0], type=ranges[i][1];
	
	if (r.length===2) { //start and end
		for (j=r[0];j<=r[1];j++) types[j]=type;
	} else {
		for (j=0;j<r.length;j++) 	types[r[j]]=type;
	}
}

var packULE=function(str){
	var out="",p="",count=0,totalcount=0;
	for (var i=0;i<str.length;i++) {
		if (str[i]!=p) {
			out+=count?(""+count+p):p;
			totalcount+=count;
			count=1;
		} else {
			count++;
		}
		p=str[i];
	}
	out+=(""+count+p);
	totalcount+=count;
	console.log("compression rate,",Math.floor(65536/out.length),"times smaller");
	return out;
}

if (process.argv[1].indexOf("gen-tokentype")>-1){

	require("fs").writeFileSync("tokentypemap.js",'module.exports="'+
		packULE(types.join(""))+'";',"utf8");
}
module.exports={TokenTypes};