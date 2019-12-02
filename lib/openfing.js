const axios = require('axios');

/*
{
        "courses":[
        	{"code":"c1",
	 "name":"Cálculo 1",
	 "eva":"https://eva.fing.edu.uy/course/view.php?id=74"
	},
        	{"code":"c2",
	 "name":"Cálculo 2",
	 "eva":"https://eva.fing.edu.uy/enrol/index.php?id=319"
	},
*/
async function getCourses() {
    return (await axios.get('https://open.fing.edu.uy/data/courses.json')).data.courses;
};

/*
{
"code":"md1",
"name":"Matemática Discreta 1",
"eva":"https://eva.fing.edu.uy/enrol/index.php?id=323",
"classes":{
"1":"Inducción completa",
"3":"Combinatoria",
"4":"Combinatoria",
"5":"Combinatoria",
*/
async function getCourse(code) {
    return (await axios.get(`https://open.fing.edu.uy/data/${code}.json`)).data;
};

// Asumo que todos son webm porque no veo otra info indicando tipo but dejo el async por las dudas
async function getCourseChapterVideoURL(code, chapter) {
	if (chapter < 10) chapter = `0${chapter}`;

	const webm_url = `http://openfing-video.fing.edu.uy/media/${code}/${code}_${chapter}.webm`;
	const mp4_url = `http://openfing-video.fing.edu.uy/media/${code}/${code}_${chapter}.mp4`;

	try {
		await axios.head(webm_url);
		return webm_url;
	} catch (error) {
		return mp4_url;
	}
}

function test() {
	return "Hello World";
}

module.exports = {
    getCourses,
    getCourse,
	getCourseChapterVideoURL,
	test
};