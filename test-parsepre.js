const fs=require("fs");
const {createCorpus}=require("./index");
const assert=require("assert");
const rendClass=["kai"];
const corpus=createCorpus({inputFormat:"pre",rendClass});
corpus.addFile("testcontent/test1pre.xml");
const {rom}=corpus.writeKDB(null);

console.log(rom.texts[0])
assert.equal(rom.texts[0][0][0],"FIRST ARTICLE")
assert.equal(rom.texts[0][0].length,4)
assert.equal(rom.texts[0][1].length,4)
const r=corpus.stringify(rom.afields[0].rend.pos[1])
assert.equal("1p3.0102-04",r);//楷體