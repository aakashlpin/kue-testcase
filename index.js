'use strict';
var kue = require('kue');
var request = require('request');
var queue = kue.createQueue();
var queueWorkerContext;
var isQueueProcessing = true;
var jobQueueName = 'scraper' + (new Date()).getTime();

var tasks = [
	{
		productName: 'A',
		productURL: 'http://google.com',
		delay: '2000'
	},
	{
		productName: 'B',
		productURL: 'http://reddit.com',
		delay: '3000'
	},
	{
		productName: 'C',
		productURL: 'http://facebook.com',
		delay: '4000'
	},
	{
		productName: 'D',
		productURL: 'http://aakashgoel.com',
		delay: '6000'
	},
	{
		productName: 'E',
		productURL: 'http://cheapass.in',
		delay: '6000'
	}
];

function processURL(url, done) {
    request(url, function(err, response, body) {
        console.log('done should be called for url => ', url);
        done(null);
    });
}

function queuePromoteAndProcess() {
    //after assigning delay to every job, promote the queue
    queue.promote();

    //begin queue processing after promoting the queue
    queue.process(jobQueueName, function (job, done, ctx) {
        console.log('processing '+ job.data.productURL);
        queueWorkerContext = ctx;
        processURL(job.data.productURL, done);
    });
}

function pauseQueueProcessing() {
    if (queueWorkerContext && isQueueProcessing) {
        console.log('pause queue processing');
        isQueueProcessing = false;
        queueWorkerContext.pause(function() {}, 1000);
    }
}

function resumeQueueProcessing() {
    if (queueWorkerContext && !isQueueProcessing) {
        console.log('resume queue processing');
        isQueueProcessing = true;
        queueWorkerContext.resume();
    }
}

function newJob(jobData) {
    //title is a field necessary for the kue lib
    jobData.title = 'Processing ' + jobData.productName;

    console.log('will process ' + jobData.productURL);

    queue.create(jobQueueName, jobData)
        .delay(jobData.delay)
        .attempts(3)
        .backoff({type:'exponential'})
        .save();
}

function removeJob(job) {
    job.remove(function(err) {
        if (err) {
            console.log('failed to remove completed job #%d', job.id);
            return;
        }

        console.log('removed completed job #%d', job.id);
    });
}

queue.on('job complete', function(id) {
    console.log('===============job completed=============');
    kue.Job.get(id, function(err, job) {
        if (err) {
            return;
        }
        removeJob(job);
    });
});

function init() {
	//init code
	tasks.forEach(function(task) {
		newJob(task);
	});

	queuePromoteAndProcess();

	setTimeout(function() {
		pauseQueueProcessing();
	}, 10000);

	setTimeout(function() {
		resumeQueueProcessing();
	}, 12000);
}

init();