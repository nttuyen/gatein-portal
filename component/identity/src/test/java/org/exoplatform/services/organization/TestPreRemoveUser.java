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
package org.exoplatform.services.organization;

import java.util.List;

import org.exoplatform.commons.utils.PageList;
import org.exoplatform.component.test.ConfigurationUnit;
import org.exoplatform.component.test.ConfiguredBy;
import org.exoplatform.component.test.ContainerScope;
import org.exoplatform.component.test.KernelLifeCycle;
import org.exoplatform.container.PortalContainer;
import org.exoplatform.container.component.ComponentRequestLifecycle;
import org.exoplatform.container.component.RequestLifeCycle;
import org.junit.After;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

@ConfiguredBy({
        @ConfigurationUnit(scope = ContainerScope.PORTAL, path = "conf/exo.portal.component.test.jcr-configuration.xml"),
        @ConfigurationUnit(scope = ContainerScope.PORTAL, path = "org/exoplatform/services/organization/TestOrganizationService-jta-configuration.xml"),
        @ConfigurationUnit(scope = ContainerScope.PORTAL, path = "org/exoplatform/services/organization/TestOrganizationService-preRemove-configuration.xml") })
public class TestPreRemoveUser {

    @ClassRule
    public static KernelLifeCycle kernel = new KernelLifeCycle();

    private static String Group1 = "Group1";
    private static final String USER = "test";

    private OrganizationService service_;

    private UserHandler userHandler_;

    private UserProfileHandler profileHandler_;

    private GroupHandler groupHandler_;

    private MembershipTypeHandler mtHandler_;

    private MembershipHandler membershipHandler_;

    private PortalContainer manager;

    @Before
    public void setUp() throws Exception {
        manager = PortalContainer.getInstance();
        service_ = (OrganizationService) manager.getComponentInstanceOfType(OrganizationService.class);
        userHandler_ = service_.getUserHandler();
        profileHandler_ = service_.getUserProfileHandler();
        groupHandler_ = service_.getGroupHandler();
        mtHandler_ = service_.getMembershipTypeHandler();
        membershipHandler_ = service_.getMembershipHandler();

        RequestLifeCycle.begin((ComponentRequestLifecycle) service_);

    }

    @After
    public void tearDown() throws Exception {
        Query query = new Query();
        query.setUserName(USER + "*");
        PageList users = userHandler_.findUsers(query);

        List<User> allUsers = users.getAll();

        for (int i = allUsers.size() - 1; i >= 0; i--) {
            String userName = allUsers.get(i).getUserName();
            userHandler_.removeUser(userName, true);
        }

        RequestLifeCycle.end();
    }

    @Test
    public void testRemoveUser() throws Exception {
        createUser(USER);
        User user = userHandler_.findUserByName(USER);

        //Create profile
        UserProfile userProfile = profileHandler_.createUserProfileInstance(USER);
        userProfile.getUserInfoMap().put("key", "value");
        profileHandler_.saveUserProfile(userProfile, true);

        //Create relation ship
        //Create group
        Group group1 = groupHandler_.createGroupInstance();
        group1.setGroupName(Group1);
        groupHandler_.addChild(null, group1, true);

        //Create membershipType
        MembershipType mt = mtHandler_.createMembershipTypeInstance();
        mt.setName("testmembership");
        mtHandler_.createMembershipType(mt, true);

        membershipHandler_.linkMembership(user, group1, mt, true);

        assertEquals("Expect number of membership in " + Group1 + " relate with user is: ", 1, membershipHandler_
                .findMembershipsByUserAndGroup(USER, group1.getId()).size());


        //Try to remove user
        UserEventListener preventRemoveListener = new PreventRemoveUserEventListener();

        userHandler_.addUserEventListener(preventRemoveListener);
        try {
            userHandler_.removeUser(USER, true);
            fail("Should exception here");
        } catch (Exception ex) {
            //Expect exception will be thrown because PreventRemoveUserEventListener
        }

        assertNotNull("User: USER must not be removed ", userHandler_.findUserByName(USER));
        user = userHandler_.findUserByName(USER);
        assertTrue("Found user instance ", user != null);
        assertEquals("Expect user name is: ", USER, user.getUserName());

        //Sure that profile is not deleted
        userProfile = profileHandler_.findUserProfileByName(USER);
        assertTrue("Expect user profile is found: ", userProfile != null);
        assertEquals(userProfile.getUserInfoMap().get("key"), "value");

        //and membership is not deleted too
        assertEquals("Expect number of membership in " + Group1 + " relate with user is: ", 1, membershipHandler_
                .findMembershipsByUserAndGroup(USER, group1.getId()).size());

        //Remove prevent remove listener for #tearDown() method run correctly
        userHandler_.removeUserEventListener(preventRemoveListener);
    }

    private static class PreventRemoveUserEventListener extends UserEventListener {
        public void preDelete(User user) throws Exception {
            throw new Exception("Can not to delete user");
        }

        public void postDelete(User user) throws Exception {
            //fail("Should not run to here");
        }
    }

    public User createUser(String userName) throws Exception {
        User user = userHandler_.createUserInstance(userName);
        user.setPassword("default");
        user.setFirstName("default");
        user.setLastName("default");
        user.setEmail("exo@exoportal.org");
        userHandler_.createUser(user, true);
        return user;
    }
}
