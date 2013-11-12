/**
 * Copyright (C) 2009 eXo Platform SAS.
 * 
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 * 
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */

define("eXo.gadget.ExoBasedUserPrefStore", ["SHARED/jquery", "eXo.gadget.Gadgets"], function($, gadgets) {	
gadgets.ExoBasedUserPrefStore = function() {
  this._gadgetsPrefToSave = {};
  this._gadgetsPrefSaving = {};
  this._gadgetsPrefWaiting = {};
  gadgets.UserPrefStore.call(this);
};

gadgets.eXoUtil.inherits(gadgets.ExoBasedUserPrefStore, gadgets.UserPrefStore);

gadgets.ExoBasedUserPrefStore.prototype.getPrefs = function(gadget) {
  return gadget.userPrefs_;
};

gadgets.ExoBasedUserPrefStore.prototype.savePrefs = function(gadget, newPrefs) {
  var newPrefs = newPrefs || gadget.userPrefs_;
  var $ggWindow = $("#gadget_" + gadget.id);
  if($ggWindow.length > 0) {
    if (!this._gadgetsPrefToSave[gadget.id]) {
      this._gadgetsPrefToSave[gadget.id] = newPrefs;
    } else {
      var prefs = this._gadgetsPrefToSave[gadget.id];
      for (var property in newPrefs) {
        prefs[property] = newPrefs[property];
      }
    }

    this._gadgetsPrefWaiting[gadget.id] = true;
    if(!this._gadgetsPrefSaving[gadget.id]) {
      this.savePrefs_(gadget);
    }
  }
}

gadgets.ExoBasedUserPrefStore.prototype.savePrefs_ = function(gadget)
{
  if(!this._gadgetsPrefWaiting[gadget.id] || this._gadgetsPrefSaving[gadget.id]) {
    //Saving in progress or has no data wait to save
    return;
  }
  this._gadgetsPrefWaiting[gadget.id] = false;
  this._gadgetsPrefSaving[gadget.id] = true;
  var newPrefs = this._gadgetsPrefToSave[gadget.id];
  this._gadgetsPrefToSave[gadget.id] = {};

  var prefs = gadgets.json.stringify(newPrefs || gadget.userPrefs_);
  var encodedPrefs = encodeURIComponent(prefs);
  var ggWindow = $("#gadget_" + gadget.id);
  if (ggWindow.length > 0)
  {
    var compID = ggWindow.parent().attr("id").replace(/^content-/, "");
    var gadgetPortlet = ggWindow.closest(".UIGadgetPortlet");
    if (gadgetPortlet.length > 0)
    {
      compID = gadgetPortlet.attr("id");
    }
    var portletFrag = ggWindow.closest(".PORTLET-FRAGMENT");
    var href = "";
    if (portletFrag.length > 0)
    {
      var portletID = portletFrag.parent().attr("id");
      href = eXo.env.server.portalBaseURL + "?portal:componentId=" + portletID;
      href += "&portal:type=action&uicomponent=" + compID;
      href += "&op=SaveUserPref";
      href += "&ajaxRequest=true";
      href += "&userPref=" + encodedPrefs;
      //ajaxGet(href, true);
    }
    else
    {
      var params = [
        {name : "userPref", value : prefs}
      ];
      href = eXo.env.server.createPortalURL(compID, "SaveUserPref", true, params);
      //ajaxGet(eXo.env.server.createPortalURL(compID, "SaveUserPref", true, params), true);
    }

    var _this = this;
    ajaxGet(href, function(request) {
      _this._gadgetsPrefSaving[gadget.id] = false;
      _this.savePrefs_(gadget);
    });
  }
};

gadgets.Container.prototype.userPrefStore = new gadgets.ExoBasedUserPrefStore();
});
