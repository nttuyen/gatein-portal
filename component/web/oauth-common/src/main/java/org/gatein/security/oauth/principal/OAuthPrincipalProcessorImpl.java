/*
 * Copyright (C) 2012 eXo Platform SAS.
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
package org.gatein.security.oauth.principal;

import java.util.HashMap;
import java.util.Map;

import org.exoplatform.container.component.ComponentPlugin;
import org.exoplatform.container.xml.InitParams;
import org.exoplatform.services.organization.User;
import org.gatein.security.oauth.spi.OAuthPrincipal;
import org.gatein.security.oauth.spi.OAuthPrincipalProcessor;
import org.gatein.security.oauth.spi.OAuthPrincipalProcessorPlugin;
import org.gatein.security.oauth.spi.OAuthProviderType;

public class OAuthPrincipalProcessorImpl implements OAuthPrincipalProcessor {
    private Map<String, OAuthPrincipalProcessorPlugin> plugins = new HashMap<String, OAuthPrincipalProcessorPlugin>();

    public void addPlugin(ComponentPlugin plugin) {
        if(plugin instanceof OAuthPrincipalProcessorPlugin) {
            OAuthPrincipalProcessorPlugin p = (OAuthPrincipalProcessorPlugin)plugin;
            if(p.getProviderKey() != null) {
                plugins.put(p.getProviderKey(), p);
            }
        }
    }

    @Override
    public User generateGateInUser(OAuthPrincipal principal) {
        OAuthProviderType providerType = principal.getOauthProviderType();
        OAuthPrincipalProcessorPlugin plugin = plugins.get(providerType.getKey());
        if(plugin == null) {
            plugin = plugins.get("default");
            if(plugin == null) {
                plugin = new DefaultPrincipalProcessorPlugin(new InitParams());
                plugins.put("default", plugin);
            }
        }

        return plugin.generateGateInUser(principal);
    }
}
