module.exports = function(app, passport, auth, cdn, paginate, mailer) {

	
	var user = require('../controllers/user')(cdn, paginate, mailer);
	var article = require('../controllers/article')(cdn, paginate);
	var page = require('../controllers/page')(cdn, paginate);
	var place = require('../controllers/place')(cdn, paginate);
	var _event = require('../controllers/event')(cdn, paginate);
	var tag = require('../controllers/tag')(cdn, paginate);
	var notice = require('../controllers/notice')(cdn, paginate);
	var img = require('../controllers/image')(cdn, paginate);
	var admin = require('../controllers/admin');
	var env = process.env.NODE_ENV || 'development';
	var config = require('../config/config')[env];


	app.get('/admin', auth.requiresAdminLogin, function(req, res, next) {
		res.render('admin/index',{title:"Administração do site UPAC"})
	})
	app.get('/admin/signin', admin.signin);
	app.post('/admin/login', passport.authenticate('local'), admin.login);
	app.all('/admin/logout', admin.logout);

	app.get('/admin/user/new', auth.requiresAdminLogin, user.admin.editnew);
	app.post('/admin/user/:id', auth.requiresAdminLogin, user.admin.update);
	app.get('/admin/user/:id', auth.requiresAdminLogin, user.admin.show);
	app.get('/admin/user/:id/edit', auth.requiresAdminLogin, user.admin.edit);
	app.get('/admin/user/:id/remove', auth.requiresAdminLogin, user.admin.remove);
	app.all('/admin/users', auth.requiresAdminLogin, user.admin.index);
	app.post('/admin/user', auth.requiresAdminLogin, user.admin.create);


	app.get('/admin/notice/new', auth.requiresAdminLogin, notice.admin.editnew);
	app.post('/admin/notice/:id', auth.requiresAdminLogin, notice.admin.update);
	app.get('/admin/notice/:id', auth.requiresAdminLogin, notice.admin.show);
	app.get('/admin/notice/:id/edit', auth.requiresAdminLogin, notice.admin.edit);
	app.get('/admin/notice/:id/remove', auth.requiresAdminLogin, notice.admin.remove);
	app.all('/admin/notices', auth.requiresAdminLogin, notice.admin.index);
	app.post('/admin/notice', auth.requiresAdminLogin, notice.admin.create);
	
	app.get('/admin/article/generateshorturls', auth.requiresAdminLogin, article.admin.generateShortUrls);
	app.get('/admin/article/new', auth.requiresAdminLogin, article.admin.editnew);
	app.post('/admin/article/:id', auth.requiresAdminLogin, article.admin.update);
	app.get('/admin/article/:id', auth.requiresAdminLogin, article.admin.show);
	app.get('/admin/article/:id/edit', auth.requiresAdminLogin, article.admin.edit);
	app.get('/admin/article/:id/remove', auth.requiresAdminLogin, article.admin.remove)
	app.all('/admin/articles', auth.requiresAdminLogin, article.admin.index);
	app.post('/admin/article', auth.requiresAdminLogin, article.admin.create);


	app.get('/admin/event/new', auth.requiresAdminLogin, _event.admin.editnew);
	app.post('/admin/event/:id', auth.requiresAdminLogin, _event.admin.update);
	app.get('/admin/event/:id', auth.requiresAdminLogin, _event.admin.show);
	app.get('/admin/event/:id/edit', auth.requiresAdminLogin, _event.admin.edit);
	app.get('/admin/event/:id/remove', auth.requiresAdminLogin, _event.admin.remove)
	app.all('/admin/events', auth.requiresAdminLogin, _event.admin.index);
	app.post('/admin/event', auth.requiresAdminLogin, _event.admin.create);

	app.get('/admin/page/new', auth.requiresAdminLogin, page.admin.editnew);
	app.post('/admin/page/:id', auth.requiresAdminLogin, page.admin.update);
	app.get('/admin/page/:id', auth.requiresAdminLogin, page.admin.show);
	app.get('/admin/page/:id/edit', auth.requiresAdminLogin, page.admin.edit);
	app.get('/admin/page/:id/remove', auth.requiresAdminLogin, page.admin.remove)
	app.all('/admin/pages', auth.requiresAdminLogin, page.admin.index);
	app.post('/admin/page', auth.requiresAdminLogin, page.admin.create);

	app.get('/admin/place/new', auth.requiresAdminLogin, place.admin.editnew);
	app.post('/admin/place/:id', auth.requiresAdminLogin, place.admin.update);
	app.get('/admin/place/:id', auth.requiresAdminLogin, place.admin.show);
	app.get('/admin/place/:id/edit', auth.requiresAdminLogin, place.admin.edit);
	app.get('/admin/place/:id/remove', auth.requiresAdminLogin, place.admin.remove)
	app.all('/admin/places', auth.requiresAdminLogin, place.admin.index);
	app.post('/admin/place', auth.requiresAdminLogin, place.admin.create);

	app.get('/admin/tag/new', auth.requiresAdminLogin, tag.admin.editnew);
	app.post('/admin/tag/:id', auth.requiresAdminLogin, tag.admin.update);
	app.get('/admin/tag/:id', auth.requiresAdminLogin, tag.admin.show);
	app.get('/admin/tag/:id/edit', auth.requiresAdminLogin, tag.admin.edit);
	app.get('/admin/tag/:id/remove', auth.requiresAdminLogin, tag.admin.remove)
	app.all('/admin/tags', auth.requiresAdminLogin, tag.admin.index);
	app.post('/admin/tag', auth.requiresAdminLogin, tag.admin.create);

	app.get('/admin/image/new', auth.requiresAdminLogin, img.admin.editnew);
	app.post('/admin/image/:id', auth.requiresAdminLogin, img.admin.update);
	app.get('/admin/image/:id', auth.requiresAdminLogin, img.admin.show);
	app.get('/admin/image/:id/edit', auth.requiresAdminLogin, img.admin.edit);
	app.get('/admin/image/:id/remove', auth.requiresAdminLogin, img.admin.remove)
	app.all('/admin/images', auth.requiresAdminLogin, img.admin.index);
	app.post('/admin/image', auth.requiresAdminLogin, img.admin.create);



	//app.get('/login', user.login);
	app.get('/logout', user.logout);

	app.get('/verify/:token', user.verify);
	app.get('/requestpasswordreset/:email', user.requestPasswordReset);
	app.get('/resetpassword/:token', user.resetPassword);

	app.all('/users', user.index);
	app.all('/users/startingwith/:term', user.searchStartingWith);
	app.post('/user', user.create);
	app.post('/user/:id/updateemailpassword', auth.requiresLogin, user.preloadById, auth.user.hasAuthorization, user.updateEmailPassword);
	app.post('/user/session', passport.authenticate('local'), user.login);

	app.put('/user/:id', auth.requiresLogin, user.preloadById, auth.user.hasAuthorization, user.update);
	app.get('/user/:username', user.show);
	app.get('/user/:username/articles', article.postsByUser);
	app.get('/user/:username/comments', article.commentsByUser);
	app.post('/user/:id/updateimage', auth.requiresLogin, user.preloadById, auth.user.hasAuthorization, user.setImage);
	//app.post('/uploadimagetest', user.uploadImageTest);
	
	app.get('/editor', auth.requiresLoginFront, article.neweditor);
	app.get('/editor/:id', auth.requiresLoginFront, article.editor);


	app.all('/article', article.index);
	app.all('/articles/bytag/:slug', article.byTag);
	app.all('/articles/byuser', auth.requiresLogin, article.listByLoggedInUser);
	app.post('/article/new', auth.requiresLogin, article.create);
	app.get('/article/find/:slug', article.bySlug);
	app.get('/article/:id', article.show);
	app.post('/article/:id', auth.requiresLogin, article.editorsave);
	app.put('/article/:id', auth.requiresLogin, article.preloadById, auth.article.hasAuthorization, article.update);
	app.get('/article/:id/remove', auth.requiresLogin, article.preloadById, auth.article.hasAuthorization, article.remove);
	app.get('/article/:id/images', article.getImages);
	app.post('/article/:id/imageupload', auth.requiresLogin, article.uploadImage);
	app.get('/article/:id/attachments', article.getAttachments);
	app.get('/article/:id/comments', article.getComments);

	app.get('/page/find/:slug', page.bySlug);
	app.get('/page/:id', page.show);
	app.get('/page/:id/images', page.getImages);
	app.get('/page/:id/attachments', page.getAttachments);

	app.get('/place/editor', auth.requiresLoginFront, place.neweditor);
	app.get('/place/editor/:id', auth.requiresLoginFront, place.editor);
	app.post('/place/new', auth.requiresLogin, place.create)
	app.get('/place/byslug/:slug', place.bySlug);
	app.post('/place/:id', auth.requiresLogin, place.editorsave);
	app.get('/place/:id', place.show);
	app.get('/place/:id/remove', auth.requiresLogin, place.remove);

	app.post('/tag/new', auth.requiresLogin, tag.create);
	app.get('/tag/:id', tag.show);
	app.get('/tag/find/:slug', tag.bySlug);
	app.put('/tag/:id', auth.requiresLogin, tag.preloadById, /* auth.tag.hasAuthorization, */ tag.update);
	app.get('/tags/startwith/:start', tag.findStartingWith);
	app.get('/tags/query', tag.findStartingWith);

	app.get('/everything2d', tag.everything2d);

	app.get('/agenda/editor', auth.requiresLogin, _event.neweditor);
	app.get('/agenda/editor/:id', auth.requiresLogin, _event.editor);

	app.get('/event/new', auth.requiresLogin, _event.create);
	app.get('/event/:id', _event.show);
	app.get('/event/:id/remove', auth.requiresLogin, _event.preloadById, auth.event.hasAuthorization, _event.remove);
	app.post('/event/:id', auth.requiresLogin, _event.editorsave);
	
	app.get('/events', _event.index);
	app.get('/events/bymonth/:year/:month', _event.byMonth);
	app.get('/events/near', _event.near);
	app.get('/events/happening', _event.happening);
	app.get('/events/past', _event.past);
	app.get('/events/future', _event.future);
	

	app.all('/notices', notice.index);
	app.post('/notice/new', auth.requiresLogin, notice.create);
	app.get('/notice/:id', notice.show);

	app.get('/image/:id', img.show);

	app.get('/s/:hash', article.shortened);
	app.get('/arquivo', article.shortListed)

	app.get('/', function(req, res) { res.render('index', {analytics: config.analytics}); });

}