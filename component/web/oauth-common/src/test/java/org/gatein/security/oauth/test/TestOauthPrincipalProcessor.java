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
package org.gatein.security.oauth.test;

import org.exoplatform.component.test.AbstractKernelTest;
import org.exoplatform.component.test.ConfigurationUnit;
import org.exoplatform.component.test.ConfiguredBy;
import org.exoplatform.component.test.ContainerScope;
import org.exoplatform.container.PortalContainer;
import org.exoplatform.services.organization.User;
import org.gatein.security.oauth.spi.OAuthPrincipal;
import org.gatein.security.oauth.spi.OAuthPrincipalProcessor;
import org.gatein.security.oauth.spi.OAuthProviderType;

@ConfiguredBy({
        @ConfigurationUnit(scope = ContainerScope.PORTAL, path = "conf/exo.portal.component.identity-configuration.xml"),
        @ConfigurationUnit(scope = ContainerScope.PORTAL, path = "conf/exo.portal.component.web.oauth-configuration.xml") })
public class TestOauthPrincipalProcessor extends AbstractKernelTest {

    private OAuthPrincipalProcessor principalProcessor;

    @Override
    protected void setUp() throws Exception {
        PortalContainer portalContainer = PortalContainer.getInstance();
        principalProcessor = portalContainer.getComponentInstanceOfType(OAuthPrincipalProcessor.class);
        begin();
    }

    @Override
    protected void tearDown() throws Exception {
        end();
    }

    public void testDefaultGenerateGateInUser() {
        OAuthProviderType providerType = new OAuthProviderType("OAUTH", true, "", null, "", "");
        OAuthPrincipal principal = new OAuthPrincipal("username", "firstName", "lastName", "displayName", "email@localhost.com", null, providerType);

        User user = principalProcessor.generateGateInUser(principal);

        assertNotNull(user);
        assertEquals("username", user.getUserName());
        assertEquals("email@localhost.com", user.getEmail());
        assertEquals("firstName", user.getFirstName());
        assertEquals("lastName", user.getLastName());
        assertEquals("displayName", user.getDisplayName());
    }

    public void testLinkedInGenerateGateInUser() {
        OAuthProviderType providerType = new OAuthProviderType("LINKEDIN", true, "", null, "", "");
        OAuthPrincipal principal = new OAuthPrincipal("randomString", "firstName", "lastName", "displayName", "linkedin_user@localhost.com", null, providerType);

        User user = principalProcessor.generateGateInUser(principal);

        assertNotNull(user);
        assertEquals("linkedin_user", user.getUserName());
        assertEquals("linkedin_user@localhost.com", user.getEmail());
        assertEquals("firstName", user.getFirstName());
        assertEquals("lastName", user.getLastName());
        assertEquals("displayName", user.getDisplayName());
    }
}
