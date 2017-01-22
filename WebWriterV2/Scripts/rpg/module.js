
var underscore = angular.module('underscore', []);
underscore.factory('_', ['$window', function ($window) {
    return $window._; // assumes underscore has already been loaded on the page
}]);

angular.module('rpg', ['directives', 'services', 'underscore', 'ngRoute', 'ngSanitize', 'ngCookies', 'ngAnimate'])
    .constant('_',
        window._
    )
    .config([
        '$locationProvider', '$routeProvider', '$httpProvider',
        function($locationProvider, $routeProvider, $httpProvider) {
            // Check login
            $httpProvider.interceptors.push('authInterceptorService');
            // Routes configuration
            $routeProvider
                /* admin */
                .when('/AngularRoute/adminSkill', {
                    templateUrl: '/views/rpg/AdminSkill.html',
                    controller: 'adminSkillController'
                })
                .when('/AngularRoute/adminThing', {
                    templateUrl: '/views/rpg/admin/thing.html',
                    controller: 'adminThingController'
                })
                .when('/AngularRoute/adminState', {
                    templateUrl: '/views/rpg/admin/state.html',
                    controller: 'adminStateController'
                })
                .when('/AngularRoute/adminCharacteristic', {
                    templateUrl: '/views/rpg/AdminCharacteristic.html',
                    controller: 'adminCharacteristicController'
                })
                .when('/AngularRoute/adminQuest', {
                    templateUrl: '/views/rpg/AdminQuest.html',
                    controller: 'adminQuestController'
                })
                .when('/AngularRoute/admin/quest/:questId/event/:eventId?', {
                    templateUrl: '/views/rpg/admin/Event.html',
                    controller: 'adminEventGeneralController'
                })
                .when('/AngularRoute/admin/quest/:questId?', {
                    templateUrl: '/views/rpg/admin/Quest.html',
                    controller: 'adminQuestGeneralController'
                })
                /* front */
                .when('/AngularRoute/guild', {
                    templateUrl: '/views/rpg/Guild.html',
                    controller: 'guildController'
                })
                .when('/AngularRoute/createHero', {
                    templateUrl: '/views/rpg/CreateHero.html',
                    controller: 'createHeroController'
                })
                .when('/AngularRoute/listHeroes', {
                    templateUrl: '/views/rpg/ListHeroes.html',
                    controller: 'listHeroesController'
                })
                .when('/AngularRoute/listQuest', {
                    templateUrl: '/views/rpg/ListQuest.html',
                    controller: 'listQuestController'
                })
                .when('/AngularRoute/travel/quest/:questId/hero/:heroId', {
                    templateUrl: '/views/rpg/Travel.html',
                    controller: 'travelController'
                })
                .when('/AngularRoute/traningRoom/:roomId/hero/:heroId', {
                    templateUrl: '/views/rpg/TraningRoom.html',
                    controller: 'traningRoomController'
                })
                .when('/AngularRoute/battle', {
                    templateUrl: '/views/rpg/battle.html',
                    controller: 'battleController'
                })
                .otherwise({
                    redirectTo: '/AngularRoute/guild'
                });

            // Uses HTLM5 history API for navigation
            $locationProvider.html5Mode(true);
        }
    ])
    //Hack to publish raw HTML code with style. Use like that {{Desc | trusted}}
    .filter('trusted', function ($sce) {
        return function (html) {
            return $sce.trustAsHtml(html);
        }
    })
    .controller('adminQuestController', [
        '$scope', '$http', 'questService', 'sexService', 'raceService', 'eventService',
        function ($scope, $http, questService, sexService, raceService, eventService) {
            $scope.quest = null;
            $scope.currentEvent = {};

            $scope.RaceList = [];
            $scope.SexList = [];
            $scope.SkillList = [];
            $scope.CharacteristicTypeList = [];

            var parentNeededToSave = false;

            init();

            $scope.currentEventWasChanged = function () {
                parentNeededToSave = false;
            }

            $scope.getParentEvent = function (currentEvent) {
                if (!currentEvent)
                    return [];
                var parentEvent = _.filter($scope.quest.AllEvents, function(filterEvent) {
                    return _.some(filterEvent.ChildrenEvents, function (someEvent) {
                        return someEvent.Id === currentEvent.Id;
                    });
                });

                return parentEvent;
            }

            $scope.removeConnectionParentEvent = function (currentEvent, parentEventId) {
                _.each($scope.quest.AllEvents, function (filterEvent) {
                    if (filterEvent.Id === parentEventId) {
                        var index = _.findLastIndex(filterEvent.ChildrenEvents,
                        {
                            Id: currentEvent.Id
                        });
                        filterEvent.ChildrenEvents.splice(index, 1);
                    }
                });
                parentNeededToSave = true;
                reloadGraph();
            }

            $scope.removeConnectionChildEvent = function (currentEvent, childEventId) {
                var index = _.findLastIndex(currentEvent.ChildrenEvents,
                    {
                        Id: childEventId
                    });
                currentEvent.ChildrenEvents.splice(index, 1);

                reloadGraph();
            }

            $scope.addConnection = function (parentEvent, childEvent) {
                parentEvent.ChildrenEvents.push(childEvent);
                parentNeededToSave = true;
                reloadGraph();
            }

            $scope.removeEvent = function (currentEvent) {
                eventService.remove(currentEvent.Id).then(function (response) {
                    //remove all link to event
                    _.each($scope.quest.AllEvents, function (filterEvent) {
                        var index = _.findLastIndex(filterEvent.ChildrenEvents,
                        {
                            Id: currentEvent.Id
                        });
                        if (index > -1)
                            filterEvent.ChildrenEvents.splice(index, 1);
                    });

                    //remove event
                    var index = _.findLastIndex($scope.quest.AllEvents,
                    {
                        Id: currentEvent.Id
                    });
                    $scope.quest.AllEvents.splice(index, 1);

                    reloadGraph();
                },
                function () {
                    alert("We can't remove event wich has child");
                });
            }

            $scope.addEvent = function () {
                var newEvent = {
                    Name: 'new',
                    ChildrenEvents: []
                };
                $scope.quest.AllEvents.push(newEvent);

                $scope.currentEvent = newEvent;

                reloadGraph();
            }

            $scope.saveEvent = function (event) {
                var questId = $scope.quest.Id;
                eventService.save(event, questId).then(function (response) {
                    updateEvent(event, response);
                    $scope.currentEvent = response;
                    alert('Event save +');
                    if (parentNeededToSave) {
                        var savedEvent = response;
                        event.Id = savedEvent.Id;
                        parentNeededToSave = false;
                        var parentEvents = $scope.getParentEvent(event);
                        var arrayPromise = parentEvents.map(function (eve) { return eventService.save(eve, questId); });
                        Promise.all(arrayPromise).then(function() {
                            reloadGraph();
                        });
                    } else {
                        reloadGraph();
                    }
                });
            }

            $scope.removeWileEvent = function(index) {
                $scope.quest.QuestEvents.splice(index, 1);
            }

            $scope.submitQuest = function() {
                var req = {
                    method: 'POST',
                    url: '/Rpg/SaveQuest',
                    data: { jsonQuest: angular.toJson($scope.quest) },
                };
                $http(req).then(
                    function(response) {
                        if (response.data)
                            alert('Save completed');
                        else {
                            alert('Some go wrong');
                        }
                    },
                    function() {
                        alert('We all gonna die');
                    }
                );
            }

            $scope.selectQuest = function (quest) {
                $scope.quest = quest;
                if ($scope.quest.AllEvents && $scope.quest.AllEvents.length > 0)
                    $scope.currentEvent = $scope.quest.AllEvents[0];
                reloadGraph();
            }

            $scope.clearActiveQuest = function () {
                $scope.quest = null;
            }

            $scope.removeQuest = function (quest, index) {
                if (confirm('Are you sure? You try delete whole event: ' + quest.Name))
                    questService.removeQuest(quest.Id).then(function (result) {
                        $scope.quests.splice(index, 1);
                        $scope.clearActiveQuest();
                    });
            }

            $scope.addQuest = function (q) {
                var newQuest = {};
                $scope.quests.push(newQuest);
                $scope.selectQuest(newQuest);
            }

            function updateEvent(oldEvent, newEvent) {
                var index = $scope.quest.AllEvents.findIndex(function (e) { return e === oldEvent; })
                $scope.quest.AllEvents[index] = newEvent;
            }

            function reloadGraph() {
                var count = $scope.quest.AllEvents.length;
                EventGraph.drawGraph($scope.quest.AllEvents, 'eventsGraph', 900, 200 * count / 3);
            }

            function loadQuest(questId) {
                questService.getQuest(questId).then(function (result) {
                    $scope.quest = result;
                    reloadGraph();
                });
            }

            function loadQuests() {
                questService.getQuests().then(function (result) {
                    $scope.quests = result;
                });
            }

            function init() {
                $scope.SexList.push({ name: 'None', value: null });
                sexService.loadSexList().then(function (data) {
                    _.each(data, function (item) {
                        return $scope.SexList.push({ name: item.Name, value: item.Value });
                    });
                });

                $scope.RaceList.push({ name: 'None', value: null });
                raceService.loadRaceList().then(function (data) {
                    _.each(data, function (item) {
                        return $scope.RaceList.push({ name: item.Name, value: item.Value });
                    });
                });

                loadQuests();
            }
        }
    ])
    .controller('adminQuestGeneralController', [
        '$scope', '$http', '$routeParams', '$location', 'questService', 'sexService', 'raceService',
            'eventService', 'CKEditorService',
        function ($scope, $http, $routeParams, $location, questService, sexService, raceService,
            eventService, CKEditorService) {

            $scope.quest = null;
            $scope.quests = [];
            $scope.wait = true;
            $scope.endingEvents = [];
            $scope.notAvailableEvents = null;
            init();

            $scope.addQuest = function() {
                $scope.quest = { Name: 'New quest Title' };
                $scope.endingEvents = [];
                $scope.notAvailableEvents = [];

                CKEditorService.reloadEditor('desc', 'New quest Desc');
            }

            $scope.selectQuest = function (quest) {
                var url = '/AngularRoute/admin/quest/' + quest.Id;
                $location.path(url);
            }

            $scope.saveQuest = function () {
                var isNew = !($scope.quest.Id > 0);
                var text = CKEditorService.getData('desc');
                $scope.quest.Desc = text;
                questService.saveQuest($scope.quest).then(
                    function (response) {
                        if (response) {
                            if (isNew) {
                                $scope.selectQuest(response);
                            } else {
                                alert('Save completed');
                            }
                        } else {
                            alert('Some go wrong');
                        }
                    },
                    function () {
                        alert('We all gonna die');
                    }
                );
            }

            $scope.exportQuest = function () {
                questService.getQuest($scope.quest.Id).then(function (result) {
                    var text = angular.toJson(result);
                    var blob = new Blob([text]);
                    var link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = $scope.quest.Name + '.json';
                    link.click();
                });
            }

            $scope.importQuest = function () {
                questService.importQuest($scope.importJson).then(function (data) {
                    //alert('We did it!');
                    var url = '/AngularRoute/admin/quest/' + data;
                    $location.path(url);
                });
            }

            $scope.removeQuest = function (quest, index) {
                if (confirm('Are you sure? You try delete whole event: ' + quest.Name))
                    questService.removeQuest(quest.Id).then(function (result) {
                        $scope.quests.splice(index, 1);
                    });
            }

            $scope.goToEvent = function (quest) {
                var url = '/AngularRoute/admin/quest/' + quest.Id + '/event/';
                $location.path(url);
            }

            $scope.selectEvent = function (eventId) {
                $scope.wait = true;
                var url = '/AngularRoute/admin/quest/' + $scope.quest.Id + '/event/' + eventId;
                $location.path(url);
            }

            $scope.changeRootEvent = function() {
                questService.changeRootEvent($scope.quest.Id, $scope.newRootEvent.Id).then(function (data) {
                    $scope.quest.RootEvent = data;
                });
            }

            function loadQuest(questId) {
                questService.getQuest(questId).then(function (result) {
                    $scope.quest = result;
                    $scope.wait = false;

                    CKEditorService.reloadEditor('desc', $scope.quest.Desc);

                    loadEndingEvents(questId);
                });
            }

            function loadQuests() {
                questService.getQuests().then(function (result) {
                    $scope.quests = result;
                });
            }

            function loadEndingEvents(questId) {
                eventService.getEndingEvents(questId).then(function (result) {
                    $scope.endingEvents = result;
                });
            }

            function loadNotAvailableEvents(questId) {
                eventService.getNotAvailableEvents(questId).then(function (result) {
                    $scope.notAvailableEvents = result;
                });
            }

            function init() {
                var questId = $routeParams.questId;
                if (questId) {
                    loadQuest(questId);
                    loadEndingEvents(questId);
                    loadNotAvailableEvents(questId);
                }
                loadQuests();
            }
        }
    ])
    .controller('adminEventGeneralController', [
        '$scope', '$http', '$routeParams', '$location', 'eventService', 'questService', 'raceService', 'requirementTypeService',
        'sexService', 'skillService', 'characteristicService', 'stateService', 'thingService', 'CKEditorService',
        function ($scope, $http, $routeParams, $location, eventService, questService, raceService, requirementTypeService,
            sexService, skillService, characteristicService, stateService, thingService, CKEditorService) {

            $scope.event = null;
            $scope.quest = null;
            $scope.selectedEvent = null;
            $scope.selectedSkill = null;
            $scope.events = [];
            $scope.wait = true;

            $scope.RaceList = [];
            $scope.SexList = [];
            $scope.Skills = [];
            $scope.CharacteristicTypes = [];
            $scope.StateTypes = [];
            $scope.ThingSamples = [];
            $scope.RequirementTypes = [];

            $scope.parentExpand = true;
            $scope.reqExpand = false;
            $scope.stateExpand = false;
            $scope.eventEdit = true;
            $scope.childExpand = true;

            var questId = $routeParams.questId;
            var raceNoneObject = { name: 'None', value: 0 };
            var sexNoneObject = { name: 'None', value: 0 };

            init();

            /* Thing */
            $scope.addThingsChanges = function () {
                var thingChangesSampleId = $scope.selectedThingChangesSample.Id;
                var value = $scope.newThingChangesSampleValue;

                eventService.addThingChanges($scope.event.Id, thingChangesSampleId, value).then(function (data) {
                    if (!$scope.event.ThingsChanges) {
                        $scope.event.ThingsChanges = [];
                    }

                    $scope.event.ThingsChanges.push(data);
                    $scope.newThingChangesSampleValue = 0;
                });
            }

            $scope.removeThing = function (thingId, index) {
                eventService.removeThingChanges($scope.event.Id, thingId).then(function () {
                    $scope.event.ThingsChanges.splice(index, 1);
                });
            };

            $scope.availableThingSamples = function () {
                if (!$scope.event) {
                    return [];
                }
                if (!$scope.event.ThingsChanges) {
                    $scope.event.ThingsChanges = [];
                }
                return $scope.ThingSamples.filter(function (thingSample) {
                    return !$scope.event.ThingsChanges.some(function (thing) {
                        return thingSample.Id === thing.ThingSample.Id;
                    });
                });
            }

            $scope.addRequirementThing = function () {
                var requirementThingSampleId = $scope.selectedRequirementThingSample.Id;
                var value = $scope.newRequirementThingSampleValue;

                eventService.addRequirementThing($scope.event.Id, requirementThingSampleId, value).then(function (data) {
                    if (!$scope.event.RequirementThings) {
                        $scope.event.RequirementThings = [];
                    }

                    $scope.event.RequirementThings.push(data);
                    $scope.newRequirementThingSampleValue = 0;
                });
            }

            $scope.removeRequirementThing = function (requirementThingId, index) {
                eventService.removeRequirementThing($scope.event.Id, requirementThingId).then(function () {
                    $scope.event.RequirementThings.splice(index, 1);
                });
            };

            $scope.availableRequirementThingSamples = function () {
                if (!$scope.event) {
                    return [];
                }
                if (!$scope.event.RequirementThings) {
                    $scope.event.RequirementThings = [];
                }
                return $scope.ThingSamples.filter(function (thingSample) {
                    return !$scope.event.RequirementThings.some(function (requirementThing) {
                        return thingSample.Id === requirementThing.ThingSample.Id;
                    });
                });
            }

            /* State */
            $scope.addState = function() {
                var typeId = $scope.selectedState.Id;
                var value = $scope.newStateValue;

                eventService.addState($scope.event.Id, typeId, value).then(function (data) {
                    if (!$scope.event.HeroStatesChanging) {
                        $scope.event.HeroStatesChanging = [];
                    }

                    $scope.event.HeroStatesChanging.push(data);
                    $scope.newStateValue = 0;
                });
            }

            $scope.removeState = function (stateId, index) {
                eventService.removeState(stateId).then(function () {
                    $scope.event.HeroStatesChanging.splice(index, 1);
                });
            };

            $scope.availableStateTypes = function () {
                if (!$scope.event) {
                    return [];
                }
                if (!$scope.event.HeroStatesChanging) {
                    $scope.event.HeroStatesChanging = [];
                }
                return $scope.StateTypes.filter(function (stateType) {
                    return !$scope.event.HeroStatesChanging.some(function (state) {
                        return stateType.Id === state.StateType.Id;
                    });
                });
            }



            $scope.addReqState = function () {
                var typeId = $scope.newRequirementStatesType.Id;
                var value = $scope.newReqStatesValue;
                var reqType = $scope.newStateReqType.Value;

                eventService.addReqState($scope.event.Id, typeId, reqType, value).then(function (data) {
                    if (!$scope.event.RequirementStates) {
                        $scope.event.RequirementStates = [];
                    }

                    $scope.event.RequirementStates.push(data);
                    $scope.newReqStatesValue = 0;
                });
            }

            $scope.removeReqState = function (stateId, index) {
                eventService.removeReqState(stateId).then(function () {
                    $scope.event.RequirementStates.splice(index, 1);
                });
            };

            $scope.availableReqStateTypes = function () {
                if (!$scope.event) {
                    return [];
                }
                if (!$scope.event.RequirementStates) {
                    $scope.event.RequirementStates = [];
                }
                return $scope.StateTypes.filter(function (stateType) {
                    return !$scope.event.RequirementStates.some(function (state) {
                        return stateType.Id === state.StateType.Id;
                    });
                });
            }

            /* Characteristic */
            $scope.addCharacteristic = function () {
                var typeId = $scope.newRequirementCharacteristicsType.Id;
                var value = $scope.newRequirementCharacteristicsValue;
                var requirementType = $scope.newRequirementType.Value;

                eventService.addCharacteristic($scope.event.Id, typeId, value, requirementType).then(function (data) {
                    if (!$scope.event.RequirementCharacteristics) {
                        $scope.event.RequirementCharacteristics = [];
                    }

                    $scope.event.RequirementCharacteristics.push(data);
                    $scope.newRequirementCharacteristicsValue = 0;
                });
            }

            $scope.removeCharacteristic = function (characteristicId, index) {
                eventService.removeCharacteristic(characteristicId).then(function() {
                    $scope.event.RequirementCharacteristics.splice(index, 1);
                });
            };

            $scope.availableCharacteristicTypes = function () {
                if (!$scope.event) {
                    return [];
                }
                if (!$scope.event.RequirementCharacteristics) {
                    $scope.event.RequirementCharacteristics = [];
                }
                return $scope.CharacteristicTypes.filter(function (charaType) {
                    return !$scope.event.RequirementCharacteristics.some(function (chara) {
                        return charaType.Id === chara.CharacteristicType.Id;
                    });
                });
            }

            /* Skill */
            $scope.addSkill = function() {
                eventService.addSkill($scope.event.Id, $scope.selectedSkill.Id).then(function () {
                    if (!$scope.event.RequirementSkill) {
                        $scope.event.RequirementSkill = [];
                    }

                    $scope.event.RequirementSkill.push($scope.selectedSkill);
                });
            }

            $scope.removeSkill = function (skill, index) {
                eventService.removeSkill($scope.event.Id, skill.Id).then(function () {
                    $scope.event.RequirementSkill.splice(index, 1);
                });
            }

            $scope.availableSkill = function () {
                if (!$scope.event) {
                    return [];
                }
                if (!$scope.event.RequirementSkill) {
                    $scope.event.RequirementSkill = [];
                }
                return $scope.Skills.filter(function(skillType) {
                    return  !$scope.event.RequirementSkill.some(function(skill) {
                        return skillType.Id === skill.Id;
                    });
                });
            }

            /* Event */
            $scope.addEvent = function () {
                $scope.event = {
                    Name: 'new',
                    ProgressChanging: 0,
                    Desc: '',
                    ChildrenEvents: []
                };

                CKEditorService.reloadEditor('desc');
                CKEditorService.setData('desc', '');
            }

            $scope.selectEvent = function (eventId) {
                $scope.wait = true;
                var url = '/AngularRoute/admin/quest/' + questId + '/event/' + eventId;
                $location.path(url);
            }

            $scope.saveEvent = function () {
                var isNew = !($scope.event.Id && $scope.event.Id > 0);
                var text = CKEditorService.getData('desc');
                $scope.event.Desc = text;

                eventService.save($scope.event, questId).then(
                    function (response) {
                        if (response) {
                            //$scope.eventForm.$setPristine();
                            //$scope.eventForm.eventName.$setPristine();
                            //$scope.eventForm.eventProgressChanging.$setPristine();
                            if (isNew) {
                                $scope.selectEvent(response.Id);
                            }
                        }
                        else {
                            alert('Some go wrong');
                        }
                    },
                    function () {
                        alert('We all gonna die');
                    }
                );
            }

            $scope.removeEvent = function (event, index) {
                if (confirm('Are you sure? You try delete whole event: ' + event.Name))
                    eventService.remove(event.Id).then(function (result) {
                        $scope.events.splice(index, 1);
                    });
            }

            /* Event Link */
            $scope.saveEventLink = function (eventLink) {
                eventLink.disable = true;
                eventService.saveEventLink(eventLink, questId).then(
                    function (response) {
                        if (response) {
                            eventLink.disable = false;
                        }
                        else {
                            alert('Some go wrong');
                        }
                    },
                    function () {
                        alert('We all gonna die');
                    }
                );
            }

            $scope.addEventLink = function() {
                var newEventLink = {
                    Id: 0,
                    Text: $scope.selectedEvent.Name,
                    FromId: $scope.event.Id,
                    ToId: $scope.selectedEvent.Id
                };

                $scope.event.LinksFromThisEvent.push(newEventLink);
            }

            $scope.removeEventLink = function (event, eventLink, index) {
                if (confirm('Are you sure? You try delete event link: ' + eventLink.Text))
                    eventService.removeEventLink(eventLink.Id).then(function (result) {
                        event.LinksFromThisEvent.splice(index, 1);
                    });
            }

            $scope.removeEventLinkParent = function (event, eventLink, index) {
                if (confirm('Are you sure? You try delete event link: ' + eventLink.Text))
                    eventService.removeEventLink(eventLink.Id).then(function (result) {
                        event.LinksToThisEvent.splice(index, 1);
                    });
            }

            $scope.addParentEventLink = function () {
                var newEventLink = {
                    Id: 0,
                    Text: $scope.selectedEvent.Name,
                    FromId: $scope.selectedEvent.Id,
                    ToId: $scope.event.Id
                };

                $scope.event.LinksToThisEvent.push(newEventLink);
            }

            $scope.goToQuest = function () {
                var url = '/AngularRoute/admin/quest/' + $scope.quest.Id;
                $location.path(url);
            }

            function loadEvent(eventId) {
                eventService.getEvent(eventId).then(function (result) {
                    $scope.event = result;
                    $scope.wait = false;

                    CKEditorService.reloadEditor('desc', $scope.event.Desc);

                    if (!$scope.event.RequirementRace) {
                        $scope.event.RequirementRace = {};
                    }
                    if ($scope.event.RequirementRace.Value === 0) {
                        $scope.event.RequirementRace.Value = raceNoneObject.value;
                    }

                    if (!$scope.event.RequirementSex) {
                        $scope.event.RequirementSex = {};
                    }
                    if ($scope.event.RequirementSex.Value === 0) {
                        $scope.event.RequirementSex.Value = sexNoneObject.value;
                    }
                });
            }

            function loadQuest(questId) {
                questService.getQuest(questId).then(function (result) {
                    $scope.quest = result;
                    $scope.wait = false;
                });
            }

            function loadEvents() {
                eventService.getEvents($routeParams.questId).then(function (result) {
                    $scope.events = result;
                });
            }

            function init() {
                var eventId = $routeParams.eventId;
                if (eventId)
                    loadEvent(eventId);
                loadEvents();
                loadQuest(questId);

                //$scope.SexList.push(sexNoneObject);
                sexService.loadSexList().then(function (data) {
                    _.each(data, function (item) {
                        return $scope.SexList.push({ name: item.Name, value: item.Value });
                    });
                });

                //$scope.RaceList.push(raceNoneObject);
                raceService.loadRaceList().then(function (data) {
                    _.each(data, function (item) {
                        return $scope.RaceList.push({ name: item.Name, value: item.Value });
                    });
                });

                skillService.loadAll().then(function(data) {
                    $scope.Skills = data;
                });

                characteristicService.loadAllCharacteristicType().then(function(data) {
                    $scope.CharacteristicTypes = data;
                });

                stateService.loadAllTypes().then(function(data) {
                    $scope.StateTypes = data;
                });

                thingService.loadAllSamples().then(function(data) {
                    $scope.ThingSamples = data;
                });

                requirementTypeService.load().then(function (data) {
                    $scope.RequirementTypes = data;
                });

            }
        }
    ])
    .controller('adminStateController', ['$scope', 'stateService',function ($scope, stateService) {
            $scope.states = [];
            $scope.newStateName = '';
            $scope.newStateDesc = '';

            init();

            $scope.add = function () {
                stateService.add($scope.newStateName, $scope.newStateDesc)
                    .then(function(data) {
                        $scope.states.push(data);

                        $scope.newStateName = '';
                        $scope.newStateDesc = '';
                    });
            }

            $scope.remove = function (stateId, index) {
                stateService.remove(stateId)
                    .then(function() {
                        $scope.states.splice(index, 1);
                    });
            }

            function init() {
                stateService.loadAllTypes().then(function (states) {
                    $scope.states = states;
                });
            }
        }
    ])
    .controller('adminThingController', ['$scope', 'thingService', function ($scope, thingService) {
        $scope.thingsSample = [];
        $scope.newThingName = '';
        $scope.newThingDesc = '';

        init();

        $scope.add = function () {
            thingService.add($scope.newThingName, $scope.newThingDesc)
                .then(function (data) {
                    $scope.thingsSample.push(data);

                    $scope.newThingName = '';
                    $scope.newThingDesc = '';
                });
        }

        $scope.remove = function (stateId, index) {
            thingService.remove(stateId)
                .then(function () {
                    $scope.thingsSample.splice(index, 1);
                });
        }

        function init() {
            thingService.loadAllSamples().then(function (data) {
                $scope.thingsSample = data;
            });
        }
    }
    ])

    .controller('adminSkillController', [
                 '$scope', 'skillService', 'stateService',
        function ($scope, skillService, stateService) {
            $scope.skills = [];
            $scope.newSkill = {
                School: {},
                SelfChanging: [],
                TargetChanging: []
            };
            $scope.skillSchools = [];
            $scope.stateType = [];
            $scope.characteristicType = [];

            skillService.loadAll().then(function (skills) {
                $scope.skills = skills;
            });

            skillService.loadSkillsSchool().then(function (skillSchools) {
                var schoolsToSelect = _.map(skillSchools, function(school) {
                    return {
                        name: school.Name,
                        value: school
                    };
                });
                $scope.skillSchools = schoolsToSelect;
            });

            stateService.loadAllTypes().then(function (stateTypes) {
                $scope.stateType = _.map(stateTypes, function (stateType) {
                    return {
                        name: stateType.Name,
                        value: stateType
                    };
                });
            });

            $scope.addState = function (source, item) {
                var copied = {};
                angular.copy(item, copied);
                source.push(copied);
            }

            $scope.removeState = function (source, index) {
                source.splice(index, 1);
            }

            $scope.saveSkill = function() {
                skillService.saveSkill($scope.newSkill).then(function(skill) {
                    var copied = {};
                    angular.copy(skill, copied);
                    $scope.skills.push(copied);
                });
            }

            $scope.removeSkill = function (skill) {
                skillService.removeSkill(skill).then(function () {
                    var index = $scope.skills.indexOf(skill);
                    $scope.skills.splice(index, 1);
                });
            }
        }
    ])
    .controller('adminCharacteristicController', [
        '$scope', 'characteristicService', 'stateService',
        function ($scope, characteristicService, stateService) {
            $scope.newCharacteristicType = {
                State: []
            };
            $scope.stateType = [];
            $scope.characteristicTypes = [];
            characteristicService.loadAllCharacteristicType().then(function (characteristics) {
                $scope.characteristicTypes = characteristics;
            });

            stateService.loadAllTypes().then(function (stateTypes) {
                $scope.stateType = _.map(stateTypes, function (stateType) {
                    return {
                        name: stateType.Name,
                        value: stateType
                    };
                });
            });

            $scope.saveCharacteristicType = function () {
                characteristicService.save($scope.newCharacteristicType).then(function (savedCharacteristicType) {
                    var copied = {};
                    angular.copy(savedCharacteristicType, copied);
                    $scope.newCharacteristicType = {};
                    $scope.characteristicTypes.push(copied);
                });
            }

            $scope.removeCharacteristicType = function (characteristicType) {
                characteristicService.removeCharacteristicType(characteristicType).then(function () {
                    var index = $scope.characteristicTypes.indexOf(characteristicType);
                    $scope.characteristicTypes.splice(index, 1);
                });
            }

            $scope.addState = function (source, item) {
                var copied = {};
                angular.copy(item, copied);
                source.push(copied);
            }

            $scope.removeState = function (source, index) {
                source.splice(index, 1);
            }
        }
    ])
    .controller('createHeroController', [
        '$scope', '$http', '$location', 'heroService', 'raceService', 'sexService','guildService',
        function ($scope, $http, $location, heroService, raceService, sexService, guildService) {
            //$scope.hero = heroService.getDefaultHero();
            heroService.loadDefaultHero().then(function (defaultHero) {
                $scope.hero = defaultHero;
            });

            $scope.step = 1;
            $scope.freeStat = 10;
            $scope.RaceList = [];
            raceService.loadRaceList().then(function(raceList) {
                $scope.RaceList = raceService.addImageToList(raceList);
            });
            $scope.SexList = [];
            sexService.loadSexList().then(function(sexList) {
                $scope.SexList = sexService.addImageToList(sexList);
            });

            function updateState(stateChanges, positive) {
                var heroState = $scope.hero.State;

                var curStat = heroState.find(function (hState) {
                    return hState.StateType.Id == stateChanges.StateType.Id;
                });
                curStat.Number += stateChanges.Number * positive;
            }

            $scope.addStat = function(stat) {
                if ($scope.freeStat > 0) {
                    stat.Number++;
                    $scope.freeStat--;

                    _.each(stat.CharacteristicType.State, function(effState) {
                        updateState(effState, 1);
                    });
                }
            };
            $scope.minusStat = function(stat) {
                if (stat.Number > 1) {
                    stat.Number--;
                    $scope.freeStat++;

                    _.each(stat.CharacteristicType.State, function (effState) {
                        updateState(effState, -1);
                    });
                }
            };

            $scope.nextStep = function() {
                $scope.step++;
            };

            $scope.prevStep = function() {
                if ($scope.step > 1) {
                    $scope.step--;
                }
            };

            $scope.selectRace = function(race) {
                $scope.hero.Race = race;
            }

            $scope.selectSex = function (sex) {
                $scope.hero.Sex = sex;
            }

            $scope.saveHero = function() {
                heroService.saveHero($scope.hero).then(function (savedHero) {
                    $location.path('/AngularRoute/guild');
                });
            }
        }
    ])
    .controller('listHeroesController', [
        '$scope', '$http', '$location', 'heroService', 'raceService', 'sexService',
        function($scope, $http, $location, heroService, raceService, sexService) {
            $scope.heroes = [];

            heroService.loadListHeroes().then(function(result) {
                $scope.heroes = result;
            });
        }
    ])
    .controller('guildController', [
        '$scope', '$location', '$cookies', 'guildService', 'questService', 'traningRoomService','heroService',
        function ($scope, $location, $cookies, guildService, questService, traningRoomService, heroService) {
            $scope.guild = {};
            $scope.currentHero = {};
            $scope.quests = [];

            init();

            $scope.restoreHero = function (hero) {
                heroService.restoreHero(hero.Id).then(function (data) {
                    heroService.updateHeroState(hero, data);
                    $scope.guild.Gold -= 5;
                });
            }

            $scope.hitHeroDebug = function (hero) {
                var st = hero.State.find(function (state) {
                    return state.StateType.Name == "Hp";
                });

                st.Number -= 5;
            }

            $scope.selectHero = function(hero) {
                $scope.currentHero = hero;
            }

            $scope.deleteHero = function (hero, index) {
                heroService.removeHero(hero).then(function () {
                    $scope.guild.Heroes.splice(index, 1);
                });
            }

            $scope.createHero = function() {
                $location.path('/AngularRoute/createHero');
            }

            $scope.goToQuest = function(quest) {
                //questService.setQuest(quest);
                //questService.setExecutor($scope.currentHero);
                if (!$scope.currentHero
                    || $scope.currentHero.Id < 1) {
                    alert('You forgot to select hero');
                    return;
                }
                if (heroService.getHp($scope.currentHero) < 1) {
                    alert('You hero is dead. How do you think he can go to quest?');
                    return;
                }
                $location.path('/AngularRoute/travel/quest/' + quest.Id + '/hero/' + $scope.currentHero.Id);
            }

            $scope.goToTrain = function(room) {
                if (!$scope.currentHero || $scope.currentHero.Id < 1) {
                    alert("Hero doesn't chosen");
                    return;
                }

                //traningRoomService.chooseRoom(room, $scope.currentHero);
                var url = '/AngularRoute/traningRoom/' + room.Id + '/hero/' + $scope.currentHero.Id;
                $location.path(url);
            }

            function init() {
                var guildId = $cookies.get('guildId');

                guildService.loadGuild(guildId).then(function (guild) {
                    $scope.guild = guild;
                });

                questService.getQuests().then(function (result) {
                    $scope.quests = result;
                });
            }
        }
    ])
    .controller('travelController', [
        '$scope', '$http', '$location', '$routeParams', '$cookies', '$timeout',
        'questService', 'eventService', 'guildService', 'heroService', 'stateService',
        function ($scope, $http, $location, $routeParams, $cookies, $timeout,
            questService, eventService, guildService, heroService, stateService) {
            $scope.quest = {};
            $scope.hero = {};
            $scope.currentEvent = {};
            $scope.ways = [];
            $scope.wait = true;
            /* animation */
            $scope.myCssVar = '';

            $scope.changes = [];

            init();

            $scope.chooseEvent = function (eventId) {
                if ($scope.hero.Id > 0) {
                    chooseEventWithHero(eventId);
                } else {
                    chooseEventOnClientSide(eventId);
                }
            };

            $scope.endQuest = function() {
                $scope.waiting = true;
                var guildId = $cookies.get('guildId');

                var url = '/Rpg/QuestCompleted?guildId=' + guildId + '&gold=' + $scope.quest.Effective;
                $http({
                        method: 'POST',
                        url: url,
                        headers: { 'Accept': 'application/json' }
                    })
                    .then(function(response) {
                        if (response.data == "+") {
                            $location.path('/AngularRoute/guild');
                        } else {
                            alert(response);
                        }
                        $scope.waiting = false;
                    }, function() {
                        alert("Hero want relax. Wait and try again");
                        $scope.waiting = false;
                    });
            }

            $scope.batle = function() {
                heroService.selectHero($scope.quest.Executor);
                $location.path('/AngularRoute/battle');
            }

            $scope.removeChange = function (changesId) {
                $scope.changes.forEach(function (el) {
                    if (el.id === changesId) {
                        el.hideClassName = 'change-item';
                        return;
                    }
                });


                (function(id) {
                    $timeout(function() {
                        $scope.changes = $scope.changes.filter(function(change) {
                            return change.id !== id;
                        });
                    }, 2000);
                })(changesId);
            }

            function alertChanges() {
                if ($scope.currentEvent.ThingsChanges
                    && $scope.currentEvent.ThingsChanges.length > 0) {
                    $scope.currentEvent.ThingsChanges.forEach(function (thingChanges) {
                        var symbol = thingChanges.Count > 0 ? '+' : '';
                        var message = thingChanges.ThingSample.Name + ':' + symbol + thingChanges.Count;
                        var changeId = 't' + thingChanges.Id;
                        $scope.changes.push({ id: changeId, text: message });
                        callRemoveChange(changeId);
                    });
                }

                if ($scope.currentEvent.HeroStatesChanging
                    && $scope.currentEvent.HeroStatesChanging.length > 0) {
                    $scope.currentEvent.HeroStatesChanging.forEach(function (stateChanges) {
                        var symbol = stateChanges.Number > 0 ? '+' : '';
                        var message = stateChanges.StateType.Name + ':' + symbol + stateChanges.Number;
                        var changeId = 's' + stateChanges.Id;
                        $scope.changes.push({ id: changeId, text: message });
                        callRemoveChange(changeId);
                    });
                }
            }

            function callRemoveChange(changeId) {
                $timeout(function () {
                    $scope.removeChange(changeId);
                }, 5000);
            }

            function chooseEventWithHero(eventId) {
                $scope.wait = true;
                eventService.getEventForTravel(eventId, $scope.hero.Id).then(function(result) {
                    $scope.ways = result.LinksFromThisEvent;
                    $scope.quest.Effective += result.ProgressChanging;
                    $scope.currentEvent = result;
                    $scope.wait = false;
                    alertChanges();
                });

                eventService.eventChangesApplyToHero(eventId, $scope.hero.Id).then(function (heroUpdated) {
                    var hero = $scope.hero;
                    heroUpdated.State.forEach(function (state) {
                        var stateTypeId = state.StateType.Id;
                        setState(hero, stateTypeId, state.Number);
                        if (heroService.getHp(hero) < 1) {
                            alert('Your hero is Dead. Noob!');
                            $location.path('/AngularRoute/guild');
                            return;
                        }
                    });

                    hero.Inventory = [];

                    heroUpdated.Inventory.forEach(function (thing) {
                        setThing(hero, thing.ThingSample, thing.Count);
                    });
                });
            }

            function chooseEventOnClientSide(eventId) {
                $scope.wait = true;
                eventService.getEventForTravelWithHero(eventId, $scope.hero).then(function (result) {
                    var event = result.frontEvent;
                    $scope.hero = result.frontHero;

                    $scope.ways = event.LinksFromThisEvent;
                    $scope.quest.Effective += event.ProgressChanging;
                    $scope.currentEvent = event;
                    $scope.wait = false;
                    alertChanges();
                });
            }

            function getState(hero, stateTypeId) {
                return _.find(hero.State, function (state) { return state.StateType.Id === stateTypeId; });
            }

            function setState(hero, stateTypeId, value) {
                return _.find(hero.State, function(state) {
                     if (state.StateType.Id === stateTypeId) {
                         state.Number = value;
                         return;
                     }
                });
            }

            function setThing(hero, thingSample, value) {
                var updateThing = _.find(hero.Inventory, function (thing) {
                    if (thing.ThingSample.Id === thingSample.Id) {
                        thing.Number = value;
                        return true;
                    }
                });

                if (!updateThing) {
                    hero.Inventory.push({
                        ItemInUse: false,
                        Count: value,
                        ThingSample: thingSample
                    });
                }
            }

            function init() {
                var questId = $routeParams.questId;
                var heroId = $routeParams.heroId;
                heroService.load(heroId).then(function(data) {
                    $scope.hero = data;

                    questService.getQuest(questId).then(function (result) {
                        $scope.quest = result;
                        $scope.quest.Effective = 0;
                        $scope.currentEvent = $scope.quest.RootEvent;
                        $scope.chooseEvent($scope.quest.RootEvent.Id);
                    });
                });
            }
        }
    ])
    .controller('traningRoomController', [
        '$scope', '$http', '$routeParams', 'traningRoomService', 'heroService',
        function($scope, $http, $routeParams, traningRoomService, heroService) {
            $scope.room = {};//traningRoomService.getRoom();
            $scope.hero = {}; //traningRoomService.getHero();
            $scope.currentSkill = null;
            $scope.waiting = false;

            init();

            $scope.selectSkill = function(skill) {
                $scope.currentSkill = skill;
            }

            $scope.availableSkills = function () {
                if (!$scope.room
                    || !$scope.hero
                    || !$scope.room.School
                    || !$scope.room.School.Skills
                    || !$scope.hero.Skills) {
                    return [];
                }

                var roomSkills = $scope.room.School.Skills;
                var heroSkills = $scope.hero.Skills;

                return roomSkills.filter(function (roomSkill) {
                    return heroSkills.every(function (heroSkill) {
                        return roomSkill.Id != heroSkill.Id;
                    });
                });
            }

            $scope.addSkill = function () {
                $scope.waiting = true;
                heroService.addSkill($scope.hero.Id, $scope.currentSkill.Id).then(
                    function (response) {
                        $scope.hero = response;
                        $scope.currentSkill = null;
                        $scope.waiting = false;
                    },
                    function () {
                        alert("Training was failed. Try again");
                        $scope.waiting = false;
                    });
            }

            function init() {
                traningRoomService.load($routeParams.roomId).then(function (data) {
                    $scope.room = data;
                });

                heroService.load($routeParams.heroId).then(function (data) {
                    $scope.hero = data;
                });
            }
        }
    ])
    .controller('listQuestController', [
        '$scope', '$http', '$location', 'questService', 'raceService', 'sexService',
        function($scope, $http, $location, questService, raceService, sexService) {
            $scope.quests = [];

            init();

            $scope.goToQuest = function (quest) {
                $location.path('/AngularRoute/travel/quest/' + quest.Id + '/hero/' + -1);
            }

            function init() {
                questService.getQuests().then(function (result) {
                    $scope.quests = result;
                });
            }
        }
    ])
    .controller('battleController', [
        '$scope', '$http', '$location', 'heroService', 'raceService', 'sexService','skillService',
        function ($scope, $http, $location, heroService, raceService, sexService, skillService) {
            $scope.hero = heroService.getSelectedHero();
            $scope.enemy = {};
            heroService.loadEnemy().then(function(enemy) {
                $scope.enemy = enemy;
            });

            $scope.battleEnd = false;

            $scope.report = '';

            $scope.attack = function (skill) {
                $scope.report = '';
                $scope.useSkill($scope.hero, $scope.enemy, skill);
                $scope.useSkill($scope.enemy, $scope.hero, $scope.enemy.Skills[0]);
            }

            $scope.useSkill = function (self, target, skill) {
                skillService.loadSkillEffect(skill.Id).then(function (fullSkill) {

                    var isEnough = skillService.isEnough(self, fullSkill);
                    if (isEnough) {
                        alert(isEnough);
                        return;
                    }

                    $scope.report += ' ' + self.Name + ' use ' + fullSkill.Name;

                    var stat;
                    for (var i = 0; i < fullSkill.SelfChanging.length; i++) {
                        var selfChange = fullSkill.SelfChanging[i];
                        stat = getState(self, selfChange.StateType.Name);
                        if (stat) {
                            stat.Number += selfChange.Number;
                            $scope.report += ' his ' + stat.StateType.Name + ': ' + selfChange.Number + ' ';
                        }
                    }

                    for (var j = 0; j < fullSkill.TargetChanging.length; j++) {
                        var targetChange = fullSkill.TargetChanging[j];
                        stat = getState(target, targetChange.StateType.Name);// _.where(target.State, { Value: targetChange.Value });
                        if (stat) {
                            stat.Number += targetChange.Number;
                            $scope.report += ' enemys' + stat.StateType.Name + ': ' + targetChange.Number + ' ';
                        }
                    }

                    $scope.recalculateState(self);
                    $scope.recalculateState(target);
                });
            }

            $scope.recalculateState = function (hero) {
                if (!hero || !hero.State)
                    return;
                var currentHpName = "Hp";
                var maxHpName = "MaxHp";
                var currentMpName = "Mp";
                var maxMpName = "MaxMp";

                var maxHpNumber = getState(hero, maxHpName).Number;
                var currentHpNumber = getState(hero, currentHpName).Number;
                var hpPercent = Math.round(100 * currentHpNumber / maxHpNumber);

                var maxMpNumber = getState(hero, maxMpName).Number;
                var currentMpNumber = getState(hero, currentMpName).Number;
                var mpPercent = Math.round(100 * currentMpNumber / maxMpNumber);

                if (currentHpNumber < 1) {
                    alert(hero.Name + ' is dead');
                    $scope.battleEnd = true;
                }

                hero.healthWidth = { 'width': hpPercent + '%' };
                hero.manaWidth = { 'width': mpPercent + '%' };
            }

            function getState(hero,stateName) {
                return _.find(hero.State, function(state) { return state.StateType.Name == stateName; });
            }
        }
    ]);
