const assert=require("assert");
const {tokenize}=require("./tokenizer");

e=tokenize("中文");
assert.equal(e.length,2,JSON.stringify(e))

e=tokenize("abc efg");
assert.equal(e.length,2,JSON.stringify(e))
assert.equal(e[0][0],"abc",JSON.stringify(e))
assert.equal(e[0][1],"abc ",JSON.stringify(e))
assert.equal(e[1][0],"efg",JSON.stringify(e))

e=tokenize("aa中 bb");
assert.equal(e.length,3,JSON.stringify(e))
assert.equal(e[0][0],"aa",JSON.stringify(e))
assert.equal(e[1][0],"中",JSON.stringify(e))
assert.equal(e[2][0],"bb",JSON.stringify(e))

e=tokenize("⿰中中⿲中中中⿳中中中");
assert.equal(e.length,3,JSON.stringify(e))

e=tokenize("孔𠀉孔");
assert.equal(e.length,3,JSON.stringify(e))
console.log(e)