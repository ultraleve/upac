Dropzone.autoDiscover = false;

$(document).ready(function(){
	
	var ID = $('body').data('id');
	var remove_url = getURLRemove(ID);
	var is_uploading = false;

	// TAGS

	var tags = $('#tags').select2({
		tags: true,
		//minimumInputLength: 1,
		multiple: true,
		id: function(e) {
			return e._id + ":" + e.name;
		},
		ajax: { 
			url: "/tags/query",
			dataType: 'json',
			data: function (term, page) {
				return {
					start: term,
				};
			},
			results: function (data, page) {
				return {results: data.tags};
			}
		},
		formatResult: function(item) {
			return item.name;
		},
		formatSelection: function(item) {
			return item.name;
		},
		createSearchChoice: function(term, data) {
			var _this = this;
			if ($(data).filter(function() {
				return this.name.localeCompare(term) === 0;
			}).length === 0) {
				return {
					_id: null,//_this.val().length,
					name: term
				};
			}
		},
	});


	// no primeiro load, criar tags

	var $tags_hidden = $('#tags-hidden');
	var select2_data = tags.select2('data');

	$('input[type=hidden]', $tags_hidden).each(function(i,el){
		select2_data[i] = {_id: $(el).attr('value'), name: $(el).attr('rel')};
	});

	tags.select2('data', select2_data);

	// onChange cria inputs

	tags.on('change',function(e){
		var data = tags.select2('data');
		$tags_hidden.html('');
		for(var i in data){
			var item = data[i];
			var input = $('<input type="hidden" name="tags[]" value="'+(item._id != null ? item._id : item.name)+'"/>');
			$tags_hidden.append(input);
		}
		console.log(e.val, data);
	});
		

	// DATE PICKER

	var Picker = function(picker_sel, input_sel){
			
		var _that = this;

		this.target = $(picker_sel);
		this.input = $(input_sel);
	
		this.target.datetimepicker({
			language: 'pt-BR'
		});
	
		this.picker = this.target.data('datetimepicker');

		this.input.click(function(){
			$('span', _that.target).click();
		});

		this.convertToView = function(){
			console.log(moment(this.input.val()));
			this.picker.setLocalDate(moment(this.input.val()).toDate());
		};

		this.convertToSubmit = function(){
			this.input.val(moment(this.picker.getLocalDate()).format());	
		};
		//console.log(this.input.val());
		if(this.input.val() === ""){
			//console.log(0);
			this.picker.setLocalDate(new Date());
		}else{
			//console.log(1);
			this.convertToView();
		}
		return this;
	};
	var pubdate = new Picker('#datetimepicker', '#publicationDate');
	var startdate, enddate;

	if($('body.editor.agenda').length){
		startdate = new Picker('#startdtpicker', '#startDate');
		enddate = new Picker('#enddtpicker', '#endDate');
	}

	function convertToSubmit(){
		if(pubdate) pubdate.convertToSubmit();
		if(startdate && enddate){
			startdate.convertToSubmit();
			enddate.convertToSubmit();
			var sd_val = moment(startdate.input.val()).unix();
			var en_val = moment(enddate.input.val()).unix();
			if(sd_val >= en_val){
				enddate.input.val( moment(startdate.input.val()).add('hours',1) );
			}
		}
	}

	function convertToView(){
		if(pubdate) pubdate.convertToView();
		if(startdate) startdate.convertToView();
		if(enddate) enddate.convertToView();
	}

	// MAP

	if($('#map').length){
		var map = L.map('map',{minZoom: 3})
		var map_tiles = new L.TileLayer('http://a.tile.openstreetmap.org/{z}/{x}/{y}.png');
		map.addLayer(map_tiles).setView(new L.LatLng(-22.9,-43.3), 4);
		map.zoomControl.setPosition('bottomleft');
		function getURLParameter(name) {
			return decodeURI(
				(RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,])[1]
			);
		}
		var regionParameter = getURLParameter('region');
		var region = (regionParameter === 'undefined') ? '' : regionParameter;

		var geosearch = new L.Control.GeoSearch({
			provider: new L.GeoSearch.Provider.Google({
				region: region
			}),
			searchLabel: 'buscar endereço...',
			zoomLevel: 14
		}).addTo(map);

		if($('#geoX').val()!='' && $('#geoY').val()!=''){
			var latlng = new L.LatLng($('#geoY').val(),$('#geoX').val());
			console.log(latlng);
			geosearch._showLocation({X: latlng.lng, Y: latlng.lat});
			map.panTo(latlng);
		}

		map.on('geosearch_showlocation', function(result) {
			console.log('zoom to: ' + result.Location.Label, result.Location.X);
			$('#geoX').val(result.Location.X);
			$('#geoY').val(result.Location.Y);
			// evitar que o endereço se apague
			if(result.Location.Label) $('#address').val(result.Location.Label);
		});

		map.on('click', function(e){
			console.log(e.latlng)
			geosearch._showLocation({X: e.latlng.lng, Y: e.latlng.lat});
		});
	}

	// NOTIFY

	function notify(msg,log) {
		$('<div></div>')
			.addClass('notification')
			.html(msg)
			.appendTo('#info')
			.fadeIn(500)
			.delay(4000)
			.slideUp(250,function(){$(this).remove();});
		console.log(msg,log);
	}

	// EXCLUIR POST

	var isRemoving = false;

	$('#post_remove').click(function(e){
		e.preventDefault();
		$('#post_remove').hide();
		$('#post_remove_confirm').show();
	}).mouseover(function(e){
		e.preventDefault();
		$('#post_remove').addClass('btn-danger');
	}).mouseout(function(e){
		e.preventDefault();
		$('#post_remove').removeClass('btn-danger');
	});

	$('#post_remove_no').click(function(e){
		e.preventDefault();
		$('#post_remove').show();
		$('#post_remove_confirm').hide();
	});

	$('#post_remove_yes').click(function(e){
		e.preventDefault();
		if(isRemoving) return;
		isRemoving = true;
		e.preventDefault();
		$.ajax({
			type: 'GET',
			url: getURLRemove(ID),
			success: function(data, status, jqXHR){
				notify('A publicação foi excluída.', null);

				setTimeout(function(){
					notify('Você será redirecionado em 2s.', null);
				},2000);
				
				setTimeout(function(){
					window.location = getURLRedirectRemove();
				},4000);

			},
			error: function(jqXHR,status,error){
				isRemoving = false;
				notify('Erro ao excluir publicação, tente novamente.', arguments);
			}
		});
	});

	// FORM SUBMIT

	var form = $('#editor_form');
	var submit = $('#submit_anchor');
	submit.click(function(e){
		e.preventDefault();
		$('#submit').click();	
	});
	form.submit(function(e){
		var data, action, loading = $('#loading');
		e.preventDefault();
		convertToSubmit();
		data = form.serialize();
		action = form.attr('action');
		console.log('saving... ', action, data);
		loading.addClass('show');
		$.ajax({
			type: 'POST',
			url: action,
			data: data,
			success: function(data, status, jqXHR){
				var url = getURLRedirect(data);
				ID = getID(data);
				$('#post_remove').removeClass('hide');
				$('#post_view').attr('href',url).removeClass('hide');
				notify('A publicação foi salva com sucesso!', data);
				convertToView();
				loading.removeClass('show');
			},
			error: function(jqXHR,status,error){
				notify('Erro ao salvar, tente novamente.', arguments);
				convertToView();
				loading.removeClass('show');
			}
		});
	});

	// TITLE

	$('#title').focus();
	$('#title').val($('#title').val());

	// REDACTOR

	$('#content').redactor({
		lang: 'pt_br',
		buttons: ['formatting', '|', 'bold', 'italic', 'deleted', '|', 'link', 'video', '|', 'unorderedlist', 'orderedlist', 'table'],
		formattingTags: ['p', 'blockquote', 'pre', 'h3', 'h4'],
		minHeight: 300,
		autoresize: false,
		plugins: ['medialibrary']
	});

	// EXCERPT

	$('#excerpt').on('keypress keyup paste',function(e){
		var limit = 140;
		var text = $(this).val();
		var chars = text.length;
		if(chars > limit){
			text.substring(0, limit);
			chars = limit;
			$('#excerpt').val(text);
			return false;
		}
		if(e.keyCode && e.keyCode==13){
			return false;
		}
		$('#excerpt_count').text(limit-chars);
	});

	// RESIZE

	$(window).resize(resize);

	function resize(e){
		var win = $(window);
		$('.redactor_editor').height(win.height() - 224);
		$('.scrollable').height(win.height() - 200);
	}

	resize();

	// ROUTES

	function getID(data){
		var id, rel = $('body').attr('rel');
		switch(rel){
			case 'post':
			case 'page':
				id = data.article._id;
				break;
			case 'place':
				id = data.page._id;
				break;
			case 'event':
				id = data.article._id;
				break;
		}
		return id;
	}

	function getURLRedirect(data){
		var url, rel = $('body').attr('rel');
		switch(rel){
			case 'post': 
				url = '/#/blog/post/'+data.article._id;
				break;
			case 'page': 
				url = '/#/rede/'+data.article.slug;
				break;
			case 'place':
				url = '/#/rede/local/'+data.page.slug;
				break;
			case 'event':
				url = '/#/agenda/evento/'+data.article._id;
				break;
		}
		return url;
	}

	function getURLRedirectRemove(){
		var url, rel = $('body').attr('rel');
		switch(rel){
			case 'post': 
				url = '/#/blog';
				break;
			case 'place':
				url = '/#/rede';
				break;
			case 'event':
				url = '/#/agenda';
				break;
		}
		return url;
	}

	function getURLRemove(id){
		var url, rel = $('body').attr('rel');
		switch(rel){
			case 'post': 
				url = '/article/'+id+'/remove';
				break;
			case 'place':
				url = '/place/'+id+'/remove';
				break;
			case 'event':
				url = '/event/'+id+'/remove';
				break;
		}
		return url;
	}
});
