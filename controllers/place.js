/***********************
 * UPAC
 * Places controller (frontend and admin)
 ***********************/
var mongoose = require('mongoose')
  , Page = mongoose.model('Page')
  , Img = mongoose.model('Img')
  , Tag = mongoose.model('Tag')
  , _ = require('underscore')

module.exports = function(cdn, paginate) {
	return {
	admin: {
		index: function(req, res, next) {
			paginate.paginate(Page,
				{
					geo: {$ne: null}
				},
				{}, req, function(err, pages, pagination) {
					if(err) return next(err);
					var total = 0;
					Page.count({}, function(err, count){
						if(err) return next(err);
						total = count;
					});
					res.render('admin/page/index', {pages:pages, total:total, pagination:pagination});
				}
			);
		},
		create: function(req, res, next) {
			var page = new Page(req.body);
			page.createdAt = new Date();
			page.save(function(err) {
				if(err) return next(err);
				res.redirect('/admin/page/'+page.id);
			});
		},
		editnew: function(req, res, next) {
			res.render('admin/page/new', {title: 'Nova Página', page: new Page()});
		},
		show: function(req, res, next) {
			Page.findById(req.param('id'), function(err, page) {
				if (err) return next(err);
				res.render('admin/page/show', {page:page});
			});
		},
		edit: function(req, res, next) {
			Page.findById(req.param('id'), function(err, page) {
				if (err) return next(err);
				res.render('admin/page/edit', {page:page});
			});
		},
		update: function(req, res, next) {
			Page.update({_id:req.param('id')}, {$set: req.body},
				function(err, page) {
					if (err) {
						if (err.code === 11000) { // duplicate key
							req.flash('error', 'Slug já existe');
							res.redirect('/admin/page/'+req.param('id'))
						} else {
							return next(err);
						}
					}
					res.redirect('/admin/page/'+req.param('id'));
				}
			);
		},
		remove: function(req, res, next) {
			Page.findByIdAndRemove(req.param('id'), function(err) {
				if (err) return next(err);
				res.redirect('/admin/pages');
			})
		},
		uploadImage: function(req, res, next) {
			var page_id = req.param('id');
			Img.upload(cdn, req.image_config,
				req.user.id,
				req.files.image.name,
				req.files.image.path,
				'page-'+page_id+'-content',
				'content',
				function(err, image) {
					if(err) return next(err);
					res.jsonx({
						msg:'ok',
						image: image
					});
				});
		},
		uploadAttachment: function(req, res, next) {
			Page.findById(req.param('id'), function(err, page){
				if(err) return next(err);
				if(!page) return res.jsonx(404, {msg: "page not found"});
				var attachment = new Attachment();
				var path = req.files.upload.name;
				attachment.filename = path.split('/').slice(-2).join('/');
				attachment.remote_name = 'page-'+page.id+'/attachments/'+attachment.filename;
				cdn.create().upload({
					container:cdn.container,
					remote: attachment.remote_name,
					local: req.files.attachment.path// <-- attachment = name do item no form de upload
				}, function(err) {
					if (err) return next(err);
					attachment.save();
					page.attachments.push(attachment.id);
					page.save(function(err){
						if (err) return res.jsonx(500, {msg: "error saving image"});
						res.jsonx({msg:"ok", image:img});
					});

				});
			});
		},
	},
	neweditor: function(req, res, next) {
		var page = new Page({
			publicationStatus:""
		});
		res.render('place/editor',{title:"Editor", place:page, is_new:true});
	},
	editor: function(req, res, next) {
		var query = {_id: req.param('id')}
		Page.findOne(query)
			.populate('images.image tags')
			.exec(function(err, page) {
				if(err) return next(err);
				console.log(page);
				if(!page) return next(null, page);
				res.render('place/editor',{title:"Editor", place:page, is_new:false});
			}
		);
	},
	editorsave: function(req, res, next) {
		var data = _.pick(req.body,
			'title', 'content', 'excerpt', 'tags', 'address',
			'publicationDate', 'publicationStatus',
			'images', 'attachments', 'geo'
		);
		data.updatedAt = new Date;
		data.images = _.map(data.images, function(image) {
			return {image:image[0], size:image[1]}
		})
		data.tags = Tag.toIDs(data.tags);
		var query = {_id: req.param('id')}
		Page.findOne(query, function(err, page) {
			if(err) return res.jsonx(500, {error: err});
			if(!page) {
				data._id = mongoose.Types.ObjectId(req.body.id);
				data.owners = [req.user.id];
				page = new Page(data);
			} else {
				if(!req.isAdmin() && !_.find(page.owners, function(owner){ return owner == req.user.id})) {
					return res.jsonx(401, {msg: 'error', err: 'unauthorized'})
				}
				page.set(data);
			}
			page.save(function(err) {
				if(err) return res.jsonx(500, {error: err});
				res.jsonx({
					msg: 'ok',
					page: page,
				});
			});
		});
	},
	index: function(req, res, next) {
		Page.find({geo: {$ne: null}})
			.populate("featuredImage owners tags")
			.exec(function(err, places) {
			if(err) return next(err);
			res.jsonx({msg: 'ok', places:places});
		});
	},
	create: function(req, res, next) {
		var data = _.pick(req.body,
			'title', 'content','excerpt', 'tags',
			'publicationDate', 'publicationStatus',
			'images', 'attachments', 'geo'
		);
		data.createdAt = data.updatedAt = new Date;
		data.owners = [req.user._id];
		data.tags = Tag.toIDs(data.tags);
		data.images = _.map(data.images, function(image) {
			return {image:image[0], size:image[1]}
		})
		var place = new Page(data);
		place.save(function(err) {
			if(err) return res.jsonx(500, {error: err});
			res.jsonx({
				msg: 'ok',
				place: place,
			});
		});
	},
	show: function(req, res, next) {
		Page.findById(req.param('id')).populate('featuredImage owners tags').exec(function(err, place) {
			if(err) return next(err);
			if(!place) return res.jsonx(404,{msg:'error', error: 'place not found'});
			Img.populate(place, 'owners.avatar', function(err,place) {
				if(err) return next(err);
				res.jsonx({msg: 'ok', place:place});
			})
		})
	},
	bySlug: function(req, res, next) {
		Page.findOne({slug: req.param('slug')}).populate('featuredImage owners tags').exec(function(err, place) {
			if(err) return next(err);
			if(!place) return res.jsonx(404,{msg:'error', error: 'place not found'});
			Img.populate(place, 'owners.avatar', function(err,place) {
				if(err) return next(err);
				res.jsonx({msg: 'ok', place:place});
			})
		})
	},
	remove: function(req, res, next) {
		Page.findById(req.param('id'), function(err, place) {
			if(err) return next(err);
			if(!place) return res.jsonx(404, {msg:'error', error: 'place not found'});
			if(!req.isAdmin()&&!_.find(place.owners, function(owner) {return owner == req.user.id;})) {
				return res.jsonx(401, {msg: 'error', error: 'unauthorized'});
			}
			place.remove(function(err) {
				if(err) return next(err);
				res.jsonx({msg:'ok'});
			})
		})
	},
}
}
