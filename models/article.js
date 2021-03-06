var mongoose = require('mongoose')
  , ObjectId = mongoose.Schema.ObjectId
  , Schema = mongoose.Schema
  , crypto = require('crypto');

var AttachmentSchema = new Schema({
	owner: {type:ObjectId, ref:'Article'},
	cdn_id: String,
	url: String,
	filename: String,
	size: Number,
	createdAt: Date,
});

var ImageRefSchema = new Schema({
	image: {type: ObjectId, ref:'Img'},
	size: String
});

var fields = {
	owners: [{
		type:ObjectId,
		ref: 'User'
	}],
	title: String,
	slug: {
		type: String,
		index: {
			unique: true
		}
	},
	excerpt: String,
	content: String,
	geo: {type: [Number], index: "2dsphere", required:false},
	address: String,
	parent: {type:ObjectId, ref:'Article'}, // Article
	tags: [{
		type: ObjectId,
		ref: 'Tag'
	}],
	references: [String],
	images: [ImageRefSchema],
	featuredImage: {type: ObjectId, ref:'Img'},
	attachments: [{type:ObjectId, ref:'Attachment'}],

	tags: [{type:ObjectId, ref:'Tag'}],

	publicationStatus: {
		type: String,
		'enum':['draft','published']
	},
	publicationDate: Date,

	hash: {
		type: String,
		index: {
			unique: true
		}
	},
	
	// campos dos eventos
	startDate: Date,
	endDate: Date,

	createdAt: Date,
	updatedAt: Date,
};

var ArticleSchema = new Schema(fields);
var PageSchema = new Schema(fields);
var EventSchema = new Schema(fields);

var slugify = function(str) {
	str = str.toLowerCase();
	str = str.replace(/[àáâãä]/ig, 'a');
	str = str.replace(/[éêë]/ig, 'e');
	str = str.replace(/[íï]/ig, 'i');
	str = str.replace(/[óôõö]/ig, 'o');
	str = str.replace(/[úü]/ig, 'u');
	str = str.replace(/ç/ig, 'c');
	str = str.replace(/ñ/ig, 'n');
	str = str.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
	str = str.replace(/-/ig, '_');
	str = str.replace(/\s/ig, '-');
	return str;
}

var makehash = function(num) {
	var indextable = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var len = indextable.length;
	num = Math.floor(Number(num));
	var result = ""
	while(num > 0) {
		var cur = num % len;
		result = indextable.charAt(cur) + result;
		num = (num - cur) / len;
	}
	return result;
}

ArticleSchema.pre('save', function(next) {
	if(this.isNew) {
		this.createdAt = new Date();
	}
	if(!this.slug || '' == this.slug || this.id == this.slug) {
		if(this.title && this.title.length > 0) {
			this.slug = slugify(this.title);
		} else {
			this.slug = this.id;
		}
	}
	if(!this.hash) {
		this.hash = makehash(Number(this.createdAt)-Number(new Date('2013 06 01 12:00:00'))); // make a hash based on the creation date, minus the application's initial date
	
	}
	this.updatedAt = new Date();
	var thisart = this;
	mongoose.model('Article').findOne({slug: this.slug}, function(err, article){
		if(err) return next(err);
		if(article) this.slug += '-'+crypto.randomBytes(5).toString('hex'); // se der conflito vai ser muita cagada
		next();
	})
});

PageSchema.pre('save', function(next) {
	if(this.isNew) {
		this.createdAt = new Date();
	}
	if(!this.slug || '' == this.slug || this.id == this.slug) {
		if(this.title && this.title.length > 0) {
			this.slug = slugify(this.title);
		} else {
			this.slug = this.id;
		}
	}
	this.updatedAt = new Date();
	var thisart = this;
	mongoose.model('Page').findOne({slug: this.slug}, function(err, article){
		if(err) return next(err);
		if(article) this.slug += '-'+crypto.randomBytes(5).toString('hex'); // se der conflito vai ser muita cagada
		next();
	})
})
ArticleSchema.statics.findByTagId = function(id, options, cb) {
	this.find({tags: id}, null, options, cb);
}
ArticleSchema.statics.findInRadius = function(place, radius, cb) {
	return this.model('Article').find({geo: {
		$nearSphere: place,
		$maxDistance: radius
	}}, cb);
};
mongoose.model('Attachment', AttachmentSchema);
mongoose.model('Article', ArticleSchema);
mongoose.model('Page', PageSchema)