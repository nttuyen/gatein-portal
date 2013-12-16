(function() {

  var AddNewPageView = Backbone.View.extend({
    events : { 
      "click .cancel" : "cancel",
      "click .create" : "submit",
      "focusout input[name='pageName']" : "checkPageExisted"
    },
    
    cancel : function() {
      this.$el.removeData('modal');
    },
    
    submit : function() {
      var form = this.$el.find('form');
      var pageNameInput = form.find("input[name='pageName']");
      if (this.verifyPageName(pageNameInput)) {
        form.submit();
      }
    },
    
    verifyPageName : function(input) {
      var regex = new RegExp('^[a-zA-Z0-9._-]$');
      var pageName = $(input).val();
      if (!pageName) {
        setTimeout(function(){
          $(input).select();
        }, 0);
        return false;
      }
      if (!regex.test(pageName)) {
        this.message("Only alpha, digit, dash and underscore characters allowed for page name.");
        //workaround to select input
        setTimeout(function(){
          $(input).select();
        }, 0);
        return false;
      }
      return true;
    },
    
    checkPageExisted : function(e) {
      var _this = this;
      var $el = this.$el; 
      var checkPageURL = this.$el.attr('data-checkpage-url');
      var input = e.target;
      if (this.verifyPageName(input)) {
        var parent = this.$el.find("select[name='parent']").val();
        var pageName = $(input).val();
        $.ajax({
          url : checkPageURL,
          data : {
            "pageName" : pageName,
            "parent" : parent
          },
          statusCode : {
            200 : function() {
              $el.find('.modal-header .alert').remove();
            }, 
            500 : function() {
              _this.message("The \"" + pageName + "\" is existed");
              $(input).select();
            }
          }
        });
      }
    },
    
    message : function(msg) {
      var alertBox = $("<div class='alert alert-error'></div>")
      alertBox.text(msg);
      this.$el.find('.modal-header').append(alertBox);
      alertBox.fadeOut(5000);
    }
  });
  
  var ComposerView = Backbone.View.extend({
    events : {
      "keyup .composer-filter" : "onKeyUp"
    },

    initialize : function(options) {
      this.model = new Composer([], {model: ComposerTab, urlRoot: this.$el.attr("data-url")});

      //model attribute in options is modelType in children of ContentType
      this.model.fetch({reset: true, model: Application});

      this.listenTo(this.model, 'sync', this.render);
    },

    render: function() {
      var $container = $('#composer-apps');
      var template = $("#composer-apps-template").html();
      var html = _.template(template, {items: this.model.toJSON()});
      $container.html(html);
      $container.find("li.content").draggable({
        connectToSortable: ".sortable",
        revert: "invalid",
        helper: "clone"
      });
    },

    filterApp: function() {
      var filter = this.model.get('filterValue');
      var regex = new RegExp(filter, 'i');

      //TODO: Need to refact this code
      var contentTypes = [];
      var $container = $("#composer-apps");

      //For each tab
      _.each(this.model.toJSON(), function(contentType) {
        var $tab = $container.find('a[href="#tab-' + contentType.tagName + '"]').parent();
        var children = contentType.children;
        contentType.children = [];

        //Foreach app in tab
        _.each(children, function(app) {
          var $element = $container.find('li[data-contentId="'+app.contentId+'"]');
          if($element.length > 0) {
            if(regex.test(app.title)) {
              contentType.children.push(app);
              $element.show();
            } else {
              $element.hide();
            }
          }
          /*if(regex.test(app.title)) {
            contentType.children.push(app);
          }*/
        });

        if($tab.length > 0) {
          if(contentType.children.length == 0) {
            $tab.hide();
          } else {
            $tab.show();
          }
        }
      });

      //this.renderApps(contentTypes);

      return;
    },

    onKeyUp: function(e) {
      var keyCode = e.keyCode || e.which;
      var timeToWait = 500;
      var $target = $(e.target);

      if(keyCode == 27) {
        //Escape key
        $(e.target).val("");
        timeToWait = 0;
      }

      if(this.model.get('filterValue') == $.trim($target.val())) {
        return;
      } else {
        this.model.set('filterValue', $.trim($target.val()));
      }

      if(!$target.hasClass("loading")) {
        $target.addClass("loading");
      }

      if(this.timeout) {
        clearTimeout(this.timeout);
      }

      var _this = this;
      this.timeout =  setTimeout(function() {
        _this.filterApp();
        $target.removeClass("loading");
      }, timeToWait);
    },

    findContent: function(contentId) {
      var type = _.find(this.model.getChildren(), function(type) {
        return type.findByContentId(contentId) || false;
      });
      return type.findByContentId(contentId);
    }
  });

  var ApplicationView = Backbone.View.extend({
    tagName: "div",

    className: "window",

    events : {
      "click .close" : "deleteApp"
    },

    initialize: function() {

      // Bind the callback 'updateContent' to the 'change' event of the Application model
      // The callback will be executed in this ApplicationView object context
      this.model.on('change:content', this.render, this);
    },

    // Render the application frame from template
    render: function() {
      var template = _.template($("#application-template").html());
      this.$el.html(template(this.model.toJSON()));
      this.$el.attr("id", this.model.getId());
      this.$el.find('.content').append("<div class='mask-layer'></div>");
      return this;
    },

    deleteApp: function() {
      this.model.getParent().removeChild(this.model);

      // Update snapshot
      var pageView = window.editorView.getPageView();
      pageView.model.updateSnapshot();
    }
  });

  var ContainerView = Backbone.View.extend({

    initialize : function(options) {

      // Listen to add/remove events on the new model
      this.listenTo(this.model, 'container.addChild', this.onAddChild);
      this.listenTo(this.model, 'container.removeChild', this.onRemoveChild);

      var domId = "#" + this.model.getId();
      this.$el = $(domId);

      this.setupDnD();
    },
    
    events : {
      "dragenter" : "dragEnter",
      "dragover"  : "dragOver",
      "dragleave" : "dragLeave",
      "drop"      : "drop"
    },

    dragEnter : function ( event ) {
      console.log('enter');
      event.preventDefault();
      $('.portlet-placeholder').remove();
      
      if (this.model.isEmpty()) {
        $('#' + this.model.id).append("<li class='portlet-placeholder'></li>");
        return;
      }
      var Position = Backbone.Model;
      var list = new Backbone.Collection;
      list.comparator = 'top';
      
      $.each(this.model.getChildren(), function() {
        var top = $('#' + this.getId()).offset().top;
        list.add(new Position({id : this.getId(), top: top}));
      });
      list.add(new Position({id : 'placeholder', top : event.originalEvent.pageY}));
      var placeHolder = list.get('placeholder');
      var index = list.indexOf(placeHolder);
      if (list.at(index - 1)) {
        var id = list.at(index - 1).id;
        $("<li class='portlet-placeholder'></li>").insertAfter('#' + id);
      }
    },

    dragOver : function ( event ) {
      event.preventDefault();
    },

    dragLeave : function ( event ) {
      console.log('leave');
      event.preventDefault();
      if (!this.isInside(event)) {
        this.$el.find('.portlet-placeholder').remove();
      }
    },

    drop : function ( event ) {
      event.preventDefault();
      
      var files = event.originalEvent.dataTransfer.files;
      var formData = new FormData();
      formData.append('file', files[0]);
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/portal/upload');
      xhr.onload = function () {
        if (xhr.status === 200) {
          console.log('all done: ' + xhr.status);
        } else {
          console.log('Something went terribly wrong...');
        }
      };
      
      var file = files[0];
      var acceptedTypes = {
          'image/png': true,
          'image/jpeg': true,
          'image/gif': true
        };

      if (acceptedTypes[file.type] === true) {
        var reader = new FileReader();
        var el = this.$el;
        reader.onload = function (event) {
          var image = new Image();
          image.src = event.target.result;
          image.width = 100; // a fake resize
          el.append(image);
        };

        console.log(file);
        reader.readAsDataURL(file);
      }
      xhr.send(formData);
      $('.portlet-placeholder').remove()
    },
    
    isInside : function ( event ) {
      var top    = this.$el.offset().top;
      var left   = this.$el.offset().left;
      var right  = left + this.$el.outerWidth();
      var bottom = top + this.$el.outerHeight();
      if ((event.originalEvent.pageX > right) || (event.originalEvent.pageX < left)) {
        return false;
      }

      if ((event.originalEvent.pageY >= bottom) || (event.originalEvent.pageY <= top)) {
        return false;
      }

      return true;
    },

    // Adding DnD ability to Zone and Application
    setupDnD : function() {
      this.$el.sortable({
        connectWith : ".sortable",
        tolerance : "pointer",
        placeholder : "portlet-placeholder",
        revert : true,
        update : (function(view) {
          return function() {
            view.dropApp.apply(view, arguments);
          };
        })(this)
      });
    },

    /*
     * Listen to DOM event
     */
    // Drag and drop
    dropApp : function(event, ui) {
      var $dragObj = $(ui.item);
      var targetContainerId = $dragObj.closest('.sortable').attr('id');
      var targetContainer = null;
      if(targetContainerId == this.model.getId()) {
        targetContainer = this.model;
      } else {
        var targetContainer = this.model.getParent().getChild(targetContainerId);
      }

      var prev = $dragObj.prev('.window');
      var idx = 0;
      if (prev.length) {
        idx = $('#' + targetContainer.getId() + ' > .window').index(prev.get(0)) + 1;
      }

      // If this is a new application dragged from Composer
      if(!$dragObj.attr("id")) {

        //Add new application
        var composerView = window.editorView.getComposerView();
        //var application = composerView.apps.findWhere({ 'contentId' : $dragObj.attr("data-contentId")});
        var application = composerView.findContent($dragObj.attr("data-contentId"));

        // Clone and generate id for new application
        // TODO: It should NOT force assigning an ID value for a transient model 
        var newChild = application.clone();
        targetContainer.addChild(newChild, {at: idx});
        var pagePath = $('.pageBody').attr('data-pagePath');
        newChild.fetchContent(pagePath);

        // Remove dropped item
        $(ui.item).remove();
      } else {
        targetContainer.addChild(ui.item.attr('id'), {
          at : idx
        });
      }
      
      // Update snapshot
      var pageView = window.editorView.getPageView();
      pageView.model.updateSnapshot();
    },

    // A callback for the 'container.addChild' event of Container model
    onAddChild : function(child, container) {
      var $cont = $('#' + container.getId());
      var $app = $('#' + child.getId());
      var prev = container.at(child.getIndex() - 1);

      // If it is an existing application
      if(!$app.html()) {

        // Create new view of application
        var appView = new ApplicationView({model: child});
        $app = appView.render().$el;
      }

      if (prev) {
        $app.insertAfter($('#' + prev.getId()));
      } else {

        // Insert at beginning of container element
        $cont.prepend($app);
      }
      $cont.removeClass('emptyContainer');
    },

    // A callback for the 'container.removeChild' event of Container model.
    // It removes the child element from DOM
    onRemoveChild : function(child, container) {
      var $cont = $("#" + container.getId());
      var $app = $cont.children('#' + child.getId());
      $app.remove();

      if (container.isEmpty()) {
        console.log("onRemoveChild.......");
        $cont.addClass('emptyContainer');
      }
    }
  });

  //
  var LayoutView = Backbone.View.extend({
    initialize : function(options) {
      var options = options || {};
      this.urlRoot = this.$el.attr("data-urlRoot");
      this.layoutId = this.$el.attr('data-layoutId');
      this.pageKey = this.$el.attr('data-pageKey');

      //TODO: remove /null at the end of url - this should be refactor later
      this.urlRoot = this.urlRoot.substring(0, this.urlRoot.length - 4);

      // Build model from current DOM
      this.model = this.buildModel();
    },
    
    // Listen to clicking on SAVE button
    save : function() {

      // Delegate to MODEL#save
      var view = this;
      this.model.save({}, {
        parse: false,
        success: function(model, resp, options) {
          window.location.reload();
        },
        error: function(model, xhr, options) {
          //TODO: need to define a unified error handler on UI
          $('html').html(xhr.responseText);
        }
      });
      return this;
    },

    // Switch layout with data structure passed as the layoutData argument
    switchLayout : function(layoutData) {

      var layout = new Object();
      layout.id = layoutData.factoryId;
      layout.html = layoutData.html;
      var containers = [];
      $(layout.html).find('.sortable').each(function() {
        containers.push(this.id);
      });
      layout.containers = containers;
      
      // Start switching layout
      this.model.switchLayout(layout);
      
      // Update current DOM by layout template
      this.$el.html(layoutData.html);
      this.render();
      
      // Update ContainerView
      $(this.model.getChildren()).each(function() {
        new ContainerView({model : this});
      })
      
      return this;
    },
        
    render : function() {
      var containers = this.model.getChildren();
      $(containers).each(function() {
        var id = this.id;
        if (!this.isEmpty()) {
          var apps = this.getChildren();
          $(apps).each(function() {
            var appView = new ApplicationView({model : this});
            var $app = appView.render().$el;
            //Remove if existed app
            $('#' + appView.model.getId()).remove();
            //Append newest app content
            $('#' + id).append($app);
          });
          $container = $('#' + id);
          $container.removeClass('emptyContainer');
        }
      });
    },

    // Build model from existing DOM
    buildModel : function() {

      // TODO: Consider to initialize PageLayout model's url properly following Backbone standard
      var model = new PageLayout(
          {id : this.layoutId, pageKey: this.pageKey}, 
          {urlRoot : this.urlRoot, model : Container});

      // Loop through all Zone and Application
      this.$el.find('.sortable').each(function() {
        var container = new Container({id : this.id}, {mode : Application});

        $(this).children('.window').each(function() {
          var content = $(this).find('.content').html();
          var title = $(this).find('.title').text();
          var app = new Application({
            'id' : this.id,
            'content' : content,
            'title' : title
          });
          new ApplicationView({model : app, el : "#" + app.getId()});
          container.addChild(app);
        });

        new ContainerView({model: container});
        model.addChild(container);
      });
      
      model.updateSnapshot();
      
      return model;
    }
  });
  
  var EditorState = Backbone.Model.extend({
    defaults : {
      editMode : 0      
    }
  }, {
    NORMAL: 0,
    EDIT_PAGE: 1,
    EDIT_SITE: 2
  });

  // The root container view of Layout Edition mode
  var EditorView = Backbone.View.extend({
    events : {
      'click .switch' : 'changeLayout',
      'click #saveLayout' : 'saveLayout',
      'click .editLayout' : 'startEdit',
      'click .cancelEditLayout' : 'cancelEdit'
    },

    initialize : function() {
      this.listenTo(this.model, 'change:editMode', this.switchMode);
    },
    
    startEdit : function() {
      this.model.set('editMode', EditorState.EDIT_PAGE);
    },
    
    cancelEdit : function() {
      this.model.set('editMode', EditorState.NORMAL);
      window.location.reload();
    },
    
    switchMode : function() {
      this.$el.toggleClass('LAYOUT-EDITION');
      if (this.model.get('editMode') > EditorState.NORMAL) {

        // Initialize LayoutView 
        this.layoutView = new LayoutView({
          el : '.pageBody'
        });

        // Initialize ComposerView
        this.composerView = new ComposerView({el : '#composers'});
        this.layoutView.render();
      } else {
        delete this.layoutView;
        delete this.composerView;
      }
      this.trigger('eXo.portal.switchMode', this.model.get('editMode'), this);
    },

    getComposerView: function() {
      return this.composerView;
    },

    getPageView: function() {
      return this.layoutView;
    },

    // Delegate to the LayoutView save
    saveLayout : function() {
      this.layoutView.save();
    },

    // Clicked on Switch layout button
    changeLayout : function(e) {
      var anchor = e.target;
      var href = $(anchor).attr('href');
      e.preventDefault();

      // Make an ajax request to fetch the new layout data [layout_id, html_template]
      $.ajax({
        url : href,
        dataType : "json",
        success : function(result) {
          // Ask the layout view to switch layout with passed layout data
          var layoutView = window.editorView.layoutView;
          layoutView.switchLayout(result);
        }
      });
    }
  });

  // Trigger to initialize the LAYOUT EDITION mode
  $(function() {
    window.editorView = new EditorView({el : 'body > .container', model: new EditorState()});
    window.addNewPageView = new AddNewPageView({ el : "#addNewPageModal"});
  });
})();