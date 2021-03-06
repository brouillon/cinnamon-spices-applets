const Applet = imports.ui.applet;
const Main = imports.ui.main;
const Gettext = imports.gettext.domain('cinnamon-applets');
const _ = Gettext.gettext;

function MyApplet(orientation, panel_height, instance_id) {
    this._init(orientation, panel_height, instance_id);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,
    
    _init: function(orientation, panel_height, instance_id) {
        Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);
        
        try {
            this.set_applet_icon_symbolic_name("view-refresh");
            this.set_applet_tooltip(_("Refresh Current Cinnamon Theme"));
        }
        catch(e) {
            global.logError(e);
        }
    },
    
    on_applet_clicked: function(event) {
        Main.loadTheme();
    }
};

function main(metadata, orientation, panel_height, instance_id) {
    let myApplet = new MyApplet(orientation, panel_height, instance_id);
    return myApplet;
}
