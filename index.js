var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var yaml = Promise.promisifyAll(require('yamljs'));
var glob = Promise.promisify(require('glob'));
var _ = require('lodash');
var mergeFile = require('./merge.json');

var sortFunc = function(a, b) {
	return b.count - a.count;
};

var arrayify = function(key, obj, nju) {
	return function(el) {
		nju[key].push({
			name: el,
			count: obj[key][el].count
		});
	}
};

var objectify = function(key, nju) {
	return function(el) {
		nju[key][el.name] = nju[key][el.name] || { count: 0 }
		nju[key][el.name].count ++;
	}
};

var mergify = function(property, metadata, mergeFile) {
	return function(key) {
		var count = mergeFile[property][key].map(function(el) {
			if(metadata[property][el]) {
				var count = metadata[property][el].count;
				delete metadata[property][el];
				return count;	
			}
			return 0;
		})
		.reduce(function(prev, curr) {
			return prev + curr;
		});

		metadata[property][key] = { count: count || 1 };
	}
};

glob('../technologieplauscherl.github.io/_posts/**/*.html')
	.map(function(file) {
		return fs.readFileAsync(file);
	})
	.map(function(result) {
		return result.toString().split('---')[1];
	})
	.map(yaml.parse)
	.then(function(results) {
		var metadata = {};
		metadata.locations = {};
		metadata.speakers = {};
		results.forEach(function(el) {
			metadata.locations[el.location.name] = 
				metadata.locations[el.location.name] || { count: 0 };
			metadata.locations[el.location.name].count++;

			el.speakers.forEach(objectify('speakers', metadata));
		})
		return metadata;
	})
	.then(function(metadata) {
		Object.keys(mergeFile.speakers).forEach(mergify('speakers', metadata, mergeFile));
		Object.keys(mergeFile.locations).forEach(mergify('locations', metadata, mergeFile));
		return metadata;
	})
	.then(function(metadata) {
		var all = { locations: [], speakers: [] };
		Object.keys(metadata.locations).forEach(arrayify('locations', metadata, all));
		Object.keys(metadata.speakers).forEach(arrayify('speakers', metadata, all));
		return all;
	})
	.then(function(all) {
		all.locations.sort(sortFunc);
		all.speakers.sort(sortFunc);
		return all;
	})
	.then(function (all) {
		console.log(all);
		console.log('Speakers', all.speakers.length);
		console.log('Locations', all.locations.length);
		return fs.writeFileAsync('dist/metadata.json', JSON.stringify(all, null, '  '));
	})
	.then(function() {
		console.log('Done');
	});;
