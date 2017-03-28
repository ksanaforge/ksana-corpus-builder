const TT_PB=1,TT_PTR=4,TT_RESERVE1=10,TT_RESERVE2=11;
const SPAN_START="{",SPAN_END="}";
const ARTICLE_START="^";
const TagTypes={
	'~':TT_PB,
	'@':TT_RESERVE1,
	'#':TT_RESERVE2,
	'%':TT_PTR
}

const tagType=function(c){
	return TagTypes[c];
}
module.exports={tagType:tagType
,SPAN_START:SPAN_START,SPAN_END:SPAN_END,ARTICLE_START:ARTICLE_START
,TT_PB:TT_PB,TT_PTR:TT_PTR}