const TT_PB=1,TT_PTR=4,TT_P=5;


const TT_ARTICLE=100 , TT_HEAD=101;

const TagTypes={
	'~':TT_PB,
	'#':TT_HEAD,
	'%':TT_PTR,
	'^':TT_ARTICLE,
	'/':TT_P
}

const tagType=function(c){
	return TagTypes[c];
}
const isLineTag=function(tt){
	return (tt==TT_ARTICLE||tt==TT_HEAD);
}
module.exports={tagType:tagType,isLineTag:isLineTag
,TT_HEAD:TT_HEAD,TT_ARTICLE:TT_ARTICLE,TT_P:TT_P
,TT_PB:TT_PB,TT_PTR:TT_PTR,TT_HEAD:TT_HEAD}