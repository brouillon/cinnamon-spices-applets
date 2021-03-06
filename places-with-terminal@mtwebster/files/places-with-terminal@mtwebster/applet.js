const St = imports.gi.St;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Applet = imports.ui.applet;
const Clutter = imports.gi.Clutter;
const Cinnamon = imports.gi.Cinnamon;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Gettext = imports.gettext;
const _ = Gettext.gettext;
const Gtk = imports.gi.Gtk;
const Util = imports.misc.util;

let ICON_SIZE = 22;

String.prototype.contains = function(it) { return this.indexOf(it) != -1; };

function ok_Terminal(id)
{
    if (!id) {
        return false;
    } else if ((id == 'special:connect') || id.contains('ftp')) {
        return false;
    } else {
        return true;
    }
}

function MyPopupMenuItem()
{
	this._init.apply(this, arguments);
}

MyPopupMenuItem.prototype =
{
		__proto__: PopupMenu.PopupBaseMenuItem.prototype,
		_init: function(icon, text, loc, params)
		{
		    let term_icon = new St.Icon({icon_name: "terminal", icon_size: 16, icon_type: St.IconType.FULLCOLOR});
			PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);
			this.icon = icon;
            this.loc = loc;
			this.addActor(this.icon);
            this.labeltext = text;
			this.label = new St.Label({ text: text });
			this.addActor(this.label);
			if (ok_Terminal(this.loc)) {
			    this.buttonbox = new St.BoxLayout();
                button = new St.Button({ child: term_icon });
                button.connect('clicked', Lang.bind(this, this._terminal));
                this.buttonbox.add_actor(button);
                this.addActor(this.buttonbox);            
			}
        },

        _onButtonReleaseEvent: function (actor, event)
        {
            if ( Cinnamon.get_event_state(event) & Clutter.ModifierType.BUTTON1_MASK ) {
                this.activate(event);
            }
            return true;
        },
        
        _terminal: function () {
        
            if (this.loc == "special:home") {
                this.loc = Gio.file_new_for_path(GLib.get_home_dir()).get_uri().replace('file://','');
            } else if (this.loc == "special:desktop") {
                this.loc = Gio.file_new_for_path(GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP)).get_uri().replace('file://','');
            } else if (this.loc == "root") {
                this.loc = "/";
            } 
            Main.Util.spawnCommandLine("gnome-terminal --working-directory="+this.loc);
        }
};

function MyMenu(launcher, orientation) {
	this._init(launcher, orientation);
}

MyMenu.prototype = {
		__proto__: PopupMenu.PopupMenu.prototype,

		_init: function(launcher, orientation) {
			this._launcher = launcher;

			PopupMenu.PopupMenu.prototype._init.call(this, launcher.actor, 0.0, orientation, 0);
			Main.uiGroup.add_actor(this.actor);
			this.actor.hide();            
		}
};

function MyApplet(orientation) {
	this._init(orientation);
}

MyApplet.prototype = {
		__proto__: Applet.IconApplet.prototype,

		_init: function(orientation) {
			Applet.IconApplet.prototype._init.call(this, orientation);

			try {
				this.set_applet_icon_symbolic_name('folder');
				this.set_applet_tooltip(_("Places and bookmarks"));

				this.menuManager = new PopupMenu.PopupMenuManager(this);
				this.menu = new MyMenu(this, orientation);
				this.menuManager.addMenu(this.menu);

				this._display();
                this.refresh_menu_item = new Applet.MenuItem(_("Refresh bookmarks..."), 'view-refresh-symbolic',
                        Lang.bind(this, this._refresh));
                this._applet_context_menu.addMenuItem(this.refresh_menu_item);
                this.defaults_menu_item = new Applet.MenuItem(_("Change default programs..."), 'system-run-symbolic',
                        Lang.bind(this, this._defaults));
                this._applet_context_menu.addMenuItem(this.defaults_menu_item);
			}
			catch (e) {
				global.logError(e);
			};
		},

        _refresh: function() {
            this.menu.removeAll();
            Main.placesManager._reloadBookmarks();
            this._display();
        },

        _defaults: function() {
            Util.spawn(['gnome-control-center', 'info']);
        },

		on_applet_clicked: function(event) {    
			this.menu.toggle();        
		},

		_display: function() {
			let placeid = 0;
			this.placeItems = [];
			this.defaultPlaces = Main.placesManager.getDefaultPlaces();
			this.bookmarks     = Main.placesManager.getBookmarks();

			// Display default places
			for ( placeid; placeid < this.defaultPlaces.length; placeid++) {
				let icon = this.defaultPlaces[placeid].iconFactory(ICON_SIZE);
				this.placeItems[placeid] = new MyPopupMenuItem(icon, _(this.defaultPlaces[placeid].name),
                                    this.defaultPlaces[placeid].id.replace('bookmark:file://',''));
				this.placeItems[placeid].place = this.defaultPlaces[placeid];

				this.menu.addMenuItem(this.placeItems[placeid]);
				this.placeItems[placeid].connect('activate', function(actor, event) {
					actor.place.launch();
				});
			}
			
			// Display Computer / Filesystem
			let icon = new St.Icon({icon_name: "computer", icon_size: ICON_SIZE, icon_type: St.IconType.FULLCOLOR, style_class: 'popup-menu-icon'});
			this.computerItem = new MyPopupMenuItem(icon, _("Computer"));
			
			this.menu.addMenuItem(this.computerItem);
			this.computerItem.connect('activate', function(actor, event) {
                            Main.Util.spawnCommandLine("nautilus computer://");
			});
			
			let icon = new St.Icon({icon_name: "harddrive", icon_size: ICON_SIZE, icon_type: St.IconType.FULLCOLOR, style_class: 'popup-menu-icon'});
			this.filesystemItem = new MyPopupMenuItem(icon, _("File System"), "root");
			
			this.menu.addMenuItem(this.filesystemItem);
			this.filesystemItem.connect('activate', function(actor, event) {
                            Main.Util.spawnCommandLine("gksudo nautilus /");
			});
			
			// Separator
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

			let bookmarkid = 0;
			// Display default bookmarks
			for ( bookmarkid; bookmarkid < this.bookmarks.length; bookmarkid++, placeid++) {
				let icon = this.bookmarks[bookmarkid].iconFactory(ICON_SIZE);
				this.placeItems[placeid] = new MyPopupMenuItem(icon, _(this.bookmarks[bookmarkid].name),
                        this.bookmarks[bookmarkid].id.replace('bookmark:file://',''));
				this.placeItems[placeid].place = this.bookmarks[bookmarkid];
				this.menu.addMenuItem(this.placeItems[placeid]);
				this.placeItems[placeid].connect('activate', function(actor, event) {
					actor.place.launch();
				});
			};
		}
};

function main(metadata, orientation) {  
	let myApplet = new MyApplet(orientation);
	return myApplet;      
};
