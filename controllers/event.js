/***********************
 * UPAC
 * Events controller (frontend and admin)
 ***********************/

var mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Article = mongoose.model('Article'),
	Img = mongoose.model('Img'),
	Tag = mongoose.model('Tag'),
	_ = require('underscore');

module.exports = function(cdn, paginate) { return {
	admin: {
		// lists events with pagination
		index: function(req, res, next) {
			paginate.paginate(Article,
				{
					$or: [{startDate:{$ne: null}}, {endDate:{$ne: null}}]
				},
				{
					populate:'featuredImage owners',
					sort_by: 'createdAt',
					order: -1
				}, req, function(err, articles, pagination) {
					if(err) return next(err);
					var total = 0;
					Article.count({}, function(err, count){
						if(err) return next(err);
						total = count;
					});
					res.render('admin/event/index', {events:articles, total:total, pagination:pagination});
				}
			);
		},
		// creates a new event (unused)
		create: function(req, res, next) {
			if(req.body.parent == '') {
				delete req.body.parent;
			}
			var article = new Article(req.body);
			article.createdAt = new Date();
			if(!article.startDate) article.startDate = new Date();
			if(!article.endDate) article.endDate = new Date();
			article.save(function(err) {
				if(err) return next(err);
				res.redirect('/admin/event/'+article.id);
				//res.render('admin/article/shownew',{article:article, title:"Artigo novo: "+article.title});
			});
		},
		// shows edit interface for a new event
		editnew: function(req, res, next) {
			var article = new Article();
			res.render('agenda/editor', {event:article, form_url:'/admin/event/', close_url: '/admin/events'});
		},
		// shows an event
		show: function(req, res, next) {
			Article.findOne({_id: req.param('id')}).populate('featuredImage').exec(function(err, article) {
				if (err) return next(err);
				res.render('admin/event/show', {event:article});
			});
		},
		// shows edit interface for a previously saved event
		edit: function(req, res, next) {
			Article.findById(req.param('id'))
				.populate('featuredImage tags')
				.populate({path:'images.image',model:Img})
				.exec(function(err, article) {
					if (err) return next(err);
					res.render('agenda/editor', {event:article, form_url:'/admin/event/', close_url: '/admin/event/'+article.id});
				});
		},
		// saves event data from the event interface
		update: function(req, res, next) {
			if(req.body.parent == '') {
				delete req.body.parent;
			}
			Article.update({_id:req.param('id')}, {$set: req.body},
				function(err, article) {
					if (err) {
						if (err.code === 11000) { // duplicate key
							req.flash('error', 'Slug já existe');
							res.redirect('/admin/event/'+req.param('id'))
						} else {
							return next(err);
						}
					}
					res.redirect('/admin/event/'+req.param('id'));
				}
			);
		},
		// deletes an event
		remove: function(req, res, next) {
			Article.findByIdAndRemove(req.param('id'), function(err) {
				if (err) return next(err);
				res.redirect('/admin/events');
			})
		}
	},

	// shows edit interface for a new event
	neweditor: function(req, res, next) {
		var article = new Article({
			owners:[req.user.id],
			publicationStatus:"published",
			type:'event'
		});
		res.render('agenda/editor',{title:"Editor", event:article, is_new:true});
	},
	// shows edit interface for a previously saved event
	editor: function(req, res, next) {
		var query = {_id: req.param('id')}
		if (!req.isAdmin()) {
			query['owners'] = req.user.id;
		}
		Article.findOne(query)
			.populate('featuredImage tags')
			.populate({path:'images.image',model:Img})
			.exec(function(err, article) {
				if(err) return next(err);
				if(!article) return next(null, article);
				if(!article.featuredImage && (article.images.length > 0)) {
					article.featuredImage = article.images[0].image;
				}
				console.log(article);
				res.render('agenda/editor',{title:"Editor", event:article, is_new:false});
			}
		);
	},
	// saves data from edited events - if event does not exist, creates a new one
	editorsave: function(req, res, next) {
		var data = _.pick(req.body,
			'title', 'content', 'excerpt', 
			'publicationDate', 'publicationStatus',
			'images', 'attachments', 'featuredImage', 'tags',
			'startDate', 'endDate', 'address', 'geo'
		);
		if(!data.featuredImage || (data.featuredImage.length == 0)) {
			data.featuredImage = null;
		}
		data.updatedAt = new Date;
		data.images = _.map(data.images, function(image) {
			return {image:image, size:'normal'}
		})
		// pegar tags e transformar em ObjectIDs
		data.tags = Tag.toIDs(data.tags);
		var query = {_id: req.param('id')}
		Article.findOne(query, function(err, article) {
			if(err) return res.jsonx(500, {error: err});
			if(!article) {
				data.owners = [req.user.id];
				article = new Article(data);
				article._id = mongoose.Types.ObjectId(req.param('id'));
			} else {
				if(!req.isAdmin() && !_.find(article.owners, function(owner){ return owner == req.user.id})) {
					return res.jsonx(401, {msg: 'error', err: 'unauthorized'})
				}
				article.set(data);
			}
			article.save(function(err) {
				if(err) return res.jsonx(500, {error: err});
				res.jsonx({
					msg: 'ok',
					article: article,
				});
			});
		});
	},
	// sends data for an event
	show: function(req, res, next) {
		Article.findById(req.param('id'))
			.populate({path:'owners', select:'-resetPasswordToken -verifyToken'})
			.populate('featuredImage tags')
			.exec(function(err, article) {
			if (err) return next(err);
			if (!article) return res.jsonx(404, {error: "Event not found"});
			Img.populate(article, 'owners.avatar', function(err,_article) {
				if(err) return next(err);
				res.jsonx({
					msg: "ok",
					event: _article
				});				
			});
		});
	},
	// preloads an event, for checking permissions
	preloadById: function(req, res, next) {
		Article.findById(req.param('id'), function(err, _event) {
			if (err) return next(err);
			if (!_event) return res.jsonx(404, {error: "Event not found"});
			req._event = _event;
			next();
		});
	},
	// creates an event, filtering interesting data
	create: function(req, res, next) {
		var data = _.pick(req.body,
			'title', 'content', 'excerpt', 
			'publicationDate', 'publicationStatus',
			'images', 'attachments', 'featuredImage', 'tags',
			'startDate', 'endDate', 'address', 'geo'
		);
		if(!data.featuredImage || (data.featuredImage.length == 0)) {
			data.featuredImage = null;
		}
		data.updatedAt = new Date;
		data.images = _.map(data.images, function(image) {
			return {image:image, size:'normal'}
		})
		// turn received tags into ObjectIDs
		data.tags = Tag.toIDs(data.tags);
		var query = {_id: req.param('id')}
		data.owners = [req.user.id];
		var article = new Article(data);
		article.save(function(err) {
			if(err) return res.jsonx(500, {error: err});
			res.jsonx({
				msg: 'ok',
				article: article,
			});
		});
	},
	// removes a previously preloaded event (if permission checking was successful)
	remove: function(req, res, next) {
		req._event.remove(function(err){
			if (err) return next(err);
			res.jsonx({msg: "ok"});
		});
	},
	// finds published events within the sphere of 'radius' centered at the 'center' url parameter
	near: function(req, res, next) {
		Article.findOne({
			geo: {$nearSphere: req.param.center, $maxDistance: req.param.radius},
			publicationStatus: 'published',
			$or: [{startDate: {$ne: null}}, {endDate: {$ne: null}}]
		}, 
			function(err, events) {
				if (err) return err;
				res.jsonx({
					msg: "ok",
					events: events
				});
			}
		);
	},
	// lists published events, preloading owners, tags and featured images
	index: function(req, res, next) {
		Article.find(
			{
				publicationStatus: 'published',
				$or: [
					{startDate: {$ne: null}},
					{endDate: {$ne: null}}
				]
			})
			.populate({path:'owners', select:'-resetPasswordToken -verifyToken'})
			.populate('featuredImage tags')
			.exec(
			function(err, events) {
				if(err) return err;
				res.jsonx({
					msg:"ok",
					events: events
				});
			}
		);
	},
	// lists published events over a given month
	byMonth: function(req, res, next) {
		var year = Number(req.param('year'))
		var nextmonthyear = year;
		var month = Number(req.param('month'))-1
		var nextmonth = month + 1;
		if(nextmonth > 12) {
			nextmonth = 0;
			year += 1;
		}
		var startDate = new Date(year, month, 1);
		var endDate = new Date(nextmonthyear, nextmonth, 1);
		Article.find({
			publicationStatus: 'published',
			startDate:{$lt: endDate},
			endDate:{$gte: startDate}
		}, function(err, events) {
			if(err) return next(err);
			res.jsonx({msg: "ok", events:events});
		});
	},
	// lists published events happening at the moment
	happening: function(req, res, next) {
		var now = new Date();
		Article.find(
			{publicationStatus: 'published', startDate: {$lte: now}, endDate: {$gt: now}},
			function(err, events) {
				if (err) return err;
				res.jsonx({
					msg: "ok",
					events: events
				});
			}
		);
	},
	// lists past published events
	past: function(req, res, next) {
		var now = new Date();
		Article.find(
			{publicationStatus: 'published', endDate: {$lt: now}},
			function(err, events) {
				if (err) return err;
				res.jsonx({
					msg: "ok",
					events: events
				});
			}
		);
	},
	// lists future published events
	future: function(req, res, next) {
		var now = new Date();
		Article.find(
			{publicationStatus: 'published', startDate: {$gt: now}},
			function(err, events) {
				if (err) return err;
				res.jsonx({
					msg: "ok",
					events: events
				});
			}
		);
	}
}}
