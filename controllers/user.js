/***********************
 * UPAC
 * Users controller (frontend and admin)
 ***********************/
var mongoose = require('mongoose')
  , User = mongoose.model('User')
  , Article = mongoose.model('Article')
  , Tag = mongoose.model('Tag')
  , Img = mongoose.model('Img')
  , _ = require('underscore')
  , crypto = require('crypto')

module.exports = function (cdn, paginate, mailer) { return {
	admin: { 
		index: function (req, res, next) {
			paginate.paginate(User,{},{},req,function(err, users, pagination){
				if(err) return next(err);
				var total = 0;
				User.count({}, function(err, count) {
					if (err) return next(err);
					total = count;
				})
				res.render('admin/user/index',{users:users, total:total, title:"Usuários", pagination:pagination});
			});
		},
		editnew: function(req, res, next) {
			res.render('admin/user/new',{title:"Novo usuário"})
		},
		create: function (req, res, next) {
			var user = new User(req.body);
			user.provider = 'local';
			user.save(function(err) {
				if(err) {
					return next(err);
				}
				res.redirect('/admin/user/'+user._id.toString());
			});
		},
		show: function (req, res, next) {
			User.findById(req.param('id'),function(err, user) {
				if(err) return next(err);
				res.render('admin/user/show',{user: user, title:"Usuário: "+user.username});
			});
		},
		edit: function (req, res, next) {
			User.findById(req.param('id'),function(err, user) {
				if(err) return next(err);
				res.render('admin/user/edit',{user: user, title:"Editar usuário: "+user.username});
			});
		},
		sendPasswordReset: function(req, res, next) {
			User.findById(req.param('id'), function(err, user) {
				if(err) return next(err);
				user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
				user.resetPasswordRequest = new Date();
				user.save(function(err) {
					if(err) return next(err);
					mailer.send(user.email, 'password', {user:user, subject:"[UPAC] Pedido de link para recadastramento de senha"});
					res.render('admin/user/show_reset', {user: user});
				});
			})
		},
		update: function (req, res, next) {
			if(req.body.password && req.body.password.length<=0) {
				delete req.body.password;
			}
			User.findById(req.param('id'), 
				function(err, user) {
					if(err) return next(err);
					user.set(req.body);
					user.save(function(err) {
						if(err) return next(err);
						res.redirect('/admin/user/'+req.param('id'))
					})
				}
			);
		},
		remove: function (req, res, next) {
			User.findByIdAndRemove(req.param('id'), function(err) {
				if(err) return next(err);
				res.redirect('/admin/users');
			});
		}
	},
	logout: function(req, res) {
		req.session.cookie.expires = new Date(Date.now()+48*60*60*1000);
		req.logout();
		res.jsonx({msg:'ok'});
	},
	login: function(req, res) {
		req.session.cookie.expires = false;
		res.jsonx({
			msg:'ok',
			user: {
				id: req.user.id,
				username: req.user.username
			}
		});
	},

	create: function(req, res) {
		req.body.admin = false; // não serão criados admins por signup
		var user = new User(req.body);
		user.verificationToken = crypto.randomBytes(20).toString('hex');
		user.provider = 'local';
		user.save(function(err){
			if(err) {
				var fields = {
					name: "Nome",
					email: "E-mail",
					password: "Senha",
					username: "Nome de Usuário"
				}
				if(typeof err === "ValidationError") {
					return res.jsonx(500, {msg: 'error', error: 'erro de validação',
						fields:	_.map(err.errors, function(error, field) {
							return {field: field, validation_error: error.type};
						})
					})
				} else {
					console.log(err);
					res.addJFlash('error', 'database error');
					return res.jsonx(500, {msg:'database error', error:err});
				}
			}
			req.login(user, function(err) {
				if (err) {
					return res.jsonx(500, {
						msg: 'session error',
						error: err
					});
				}
				req.session.unverified = true;
				mailer.send(user.email, 'verify', {user: user});
				res.jsonx({
					msg:'ok',
					user: {
						id: req.user.id,
						username: req.user.username
					}
				});

			});
		});
	},
	preloadById: function(req, res, next) {
		User.findById(req.param('id'), function(err, user) {
			if (err) {
				return res.jsonxf(500,
					[{error:'database error'}], 
					{msg: 'database error', error: err}
				);
			}
			if (!user) {
				return res.jsonxf(404,
					[{error:'user not found'}],
					{msg: 'user not found'}
				);
			}
			req.profile = user;
			next();
		});
	},
	update: function(req, res) {
		var user = req.profile;
		var body = _.pick(req.body, 
			'name', 'geo', 'about', 'tags'
		);
		if (body.tags) {
			body.tags = _.map(body.tags, function(tag) {
				var m = tag.match(/^[0-9a-fA-F]{24}$/);
				if (m && m.length == 1) {
					return tag;
				} else {
					var ntag = new Tag({name:tag});
					ntag.save(function(err){
						console.info("Salvando tag %j", ntag);
					})
					return ntag._id;
				}
			});
		}
		if(body.geo && (body.geo.length == 0)) delete body.geo;
		user.set(body);
		user.save(function(err) {
			if (err) {
				return res.jsonxf(500, 
					[{error:'database error'}],
					{msg:'database error', error: err});
			}
			res.jsonx({msg:'ok', user:user});
		})
	},
	updateEmailPassword: function(req, res) {
		var user = req.profile;
		var body = _.pick(req.body, 
			'email', 'password'
		);
		if(body.password.length == 0) {
			delete body['password'];
		}
		user.set(body);
		user.save(function(err) {
			if (err) {
				return res.jsonxf(500, 
					[{error:'database error'}],
					{msg:'database error', error: err});
			}
			res.jsonx({msg:'ok', user:user});
		})
	},
	setImage: function(req, res, next) {
		var user = req.profile;
		
		Img.uploadAndReplace(user.avatar, cdn, req.image_config,
			
			user.id,
			req.files.image.name,
			req.files.image.path,
			'user-avatar-'+user.id+"-"+(new Date()).getTime(), 'profile',
			
			function(err, img) {
				if (err) {
					return res.jsonx(500, {msg: "error", error: err});
				}
				user.avatar = img.id;
				user.save(function(err) {
					if(err) return res.jsonx(500, {msg: "database error", error: err});
					res.jsonx({
						msg: "ok",
						image: img
					})

				})
			}
		);
	},
	verify: function(req, res, next) {
		var user = User
					.findOne({verificationToken:req.param('token')})
					.exec(function(err, user) {
						if(err) return next(err);
						if(!user) return res.jsonx(401, {msg: 'token not found'});
						req.login(user, function(err) {
							if (err) {
								return res.jsonx(500, {msg:'session error'});
							}
							user.verificationToken = null;
							user.save(function(err){
								if (err) {
									return res.jsonx(500, {msg:'database error'});
								}
								delete req.session.unverified;
								res.redirect('/'); 
							});
						});						
						// TODO: avisar usuário no primeiro login
					});
	},
	requestPasswordReset: function(req, res, next) {
		User.findOne({email: req.param('email')},function(err, user) {
			if(err) return next(err);
			if(!user) return res.jsonx(401, {msg: 'email not found'});
			user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
			user.resetPasswordRequestTime = new Date();
			user.save(function(err) {
				mailer.send(user.email, 'password', {user:user, subject:"[UPAC] Pedido de link para recadastramento de senha"});
				res.jsonx({msg:'ok'});
			});
		})
	},
	resetPassword: function(req, res, next) {
		var date_match = new Date();
		date_match.setDate(-1); // 1 dia de limite
		User.findOne({resetPasswordToken: req.param('token'), resetPasswordRequestTime: {$gte: date_match}}, function(err, user) {
			if(err) return next(err);
			if(!user) return res.redirect('/#/user');
			req.login(user, function(err) {
				if(err) return next(err);
				res.redirect('/#/account');
			})
		});
	},
	setPassword: function(req, res, next) {
		if(!req.isAdmin() && (req.param('id') != req.user.id)) {
			return next(null, null);
		}
		User.findById(req.param('id'), function(err, user) {
			if(err) return next(err);
			if(!user) return next(null, user);
			user.password = req.param('password');
			user.save(function(err) {
				if(err) return next(err);
				res.redirect('/#/user');
			})
		})
	},
	index: function(req, res, next) {
		var _from = req.param('from') || 0;
		var limit = req.param('limit') || 10;
		var sortby = req.param('sort_by') || '';
		var sortorder = req.param('order') || 1; 

		var query = User.find({}).select('-resetPasswordToken -verifyToken');
		if (sortby !== '') {
			query.sort(sortby,sortorder?1:-1);
		};

		query.skip(_from).limit(limit);
		query.populate('avatar');

		query.exec(function(err, users) {
			if(err) return next(err);
			var total = 0;
			User.count({}, function(err, count) {
				if (err) return next(err);
				total = count;
			})
			res.jsonx({
				msg: 'ok',
				users: users,
				from: _from,
				limit: limit,
				sort_by: sortby,
				order: sortorder,
				total: total
			});
		});
	},
	show: function(req, res, next) {
		var query = User.findOne({username: req.params.username}).select('-resetPasswordToken -verifyToken').populate('avatar tags');
		query.exec(function(err, user) {
			if(err) return res.jsonx(401, {msg: 'error',error:err});//return next(err);
			if(!user) return res.jsonx(404, {msg: 'user not found'});
			Article.find({owners:user._id, parent:null, endDate: null, publicationStatus:'published'})
				.sort('-publicationDate')
				.limit(5)
				.populate('featuredImage')
				.exec(function(err, articles) {
					if(err) return res.jsonx(401, {msg: 'error', error:err});
					res.jsonx({user:user, articles:articles})
				});
		});
	},
	remove: function(req, res, next) {
		User.remove({_id: req.param('id')}, function(err) {
			if(err) return next(err);
			res.jsonx({msg:'ok'});
		});
	},
	searchStartingWith: function(req, res, next) {
		var term = '^'+req.param('term');
		User.find({$or:[{username: {$regex: term}}, {name: {$regex: term}}]}).limit(10).exec(function(err, users){
			if (err) return res.jsonx(401, {msg: 'error', error:err});
			res.jsonx({msg:'ok', term:req.param('term'), users:users});
		})
	}
}}