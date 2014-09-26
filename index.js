'use strict';
var kue = require('kue');
var queue = kue.createQueue();
var queueWorkerContext;
var isQueueProcessing = true;
var jobQueueName = 'scraper' + (new Date()).getTime();

var tasks = [
	{
		productName: 'A',
		productURL: 'http://A',
		delay: '2000'
	},
	{
		productName: 'B',
		productURL: 'http://B',
		delay: '3000'
	},
	{
		productName: 'C',
		productURL: 'http://C',
		delay: '4000'
	},
	{
		productName: 'D',
		productURL: 'http://D',
		delay: '6000'
	},
	{
		productName: 'E',
		productURL: 'http://E',
		delay: '6000'
	}
];

function processURL(url, done) {
	setTimeout(function() {
		done(null);
	}, 2000);
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