var testgame = require(__dirname + "/testgame.js"),
	db = require(__dirname + "/../api/database.js"),
    achievements = require(__dirname + "/../api/achievements.js"),
	v1 = require(__dirname + "/../v1/achievements.js"),
	errorcodes = require(__dirname + "/../api/errorcodes.js").errorcodes,
    assert = require("assert");

describe("achievements", function() {
    
	var achdata;
	
    before(function(done) {
    	
		// insert our test data
		var query = { publickey: testgame.publickey };
        db.Achievement.remove(query, function(error) {
        	db.AchievementPlayer.remove(query, function(error) {

	        	var data = [
	        		{ achievement: "Super Mega Achievement #1", achievementkey: "secretkey" },
	        		{ achievement: "Super Mega Achievement #2", achievementkey: "secretkey2" },
	        		{ achievement: "Super Mega Achievement #3", achievementkey: "secretkey3" }
	        	];
	        	
				function waitForCache() {
	    			if(!achievements.ready) {
						return setTimeout(waitForCache, 100);
					}	
					
					achdata = achievements.data();
					return done();
				}
	        	
	        	function nextAchievement() {
	        		if(data.length === 0) {
	        			achievements.ready = false;
	        			achievements.forceRefresh();
	        			return waitForCache();
	        		}
	        		
	        		var achievement = data.shift();
	        		achievement.publickey = testgame.publickey;
	        		
					var nachievement = new db.Achievement(achievement);
					nachievement.save(function(error) {
						if(error) {
							throw(error);
						}
						
						return nextAchievement();
					});
	        	}
	        	
	        	return nextAchievement();	
        	});
        });
    });
     
    it("Achievements load correctly", function() {
		assert.notEqual(achdata, null);
		assert.notEqual(achdata[testgame.publickey], null);
		assert.equal(achdata[testgame.publickey].achievements.length, 3);
		
		// sort and verify
		achdata[testgame.publickey].achievements.sort(function(a, b) {
			return a.achievement.toLowerCase() < b.achievement.toLowerCase() ? -1 : 1;
		});
		assert.equal(achdata[testgame.publickey].achievements[0].achievement, "Super Mega Achievement #1");
		assert.equal(achdata[testgame.publickey].achievements[1].achievement, "Super Mega Achievement #2");
		assert.equal(achdata[testgame.publickey].achievements[2].achievement, "Super Mega Achievement #3");
    });
	
    it("Achievements can be awarded one-time correctly", function(done) {
		var achievement = {
			publickey: testgame.publickey,
			achievement: "Super Mega Achievement #1",
			achievementkey: "secretkey",
			playerid: "1",
			playername: "ben"
		};

		setTimeout(function() {
			
			achievements.save(achievement, function(error, errorcode) {
				assert.equal(error, null);
				assert.equal(errorcode, 0);
	
				// saving a second time fails
				achievements.save(achievement, function(error, errorcode) {
		            assert.equal(error, null);
		            assert.equal(errorcode, errorcodes.AlreadyHadAchievementNotSaved);
					
					// force a delay for the next save
					done();
				});
			});
		}, 2000);
    });
	
    it("Invalid achievements", function(done) {
		var achievement = {
			publickey: testgame.publickey,
			achievement: "Super Mega Spelt Wrong",
			achievementkey: "secretkey",
			playerid: "1",
			playername: "ben"
		};
		
		achievements.save(achievement, function(error, errorcode) {
			assert.notEqual(error, null);
			assert.equal(errorcode, errorcodes.InvalidAchievement);

			achievement = {
				publickey: testgame.publickey,
				achievement: "Super Mega Achievement #1",
				achievementkey: "invalidkey",
				playerid: "1",
				playername: "ben"
			};
			
			achievements.save(achievement, function(error, errorcode) {
	            assert.notEqual(error, null);
	            assert.equal(errorcode, errorcodes.InvalidAchievement);
				done();
			});
		});
    });
	
    it("Missing data errors", function(done) {
		var achievement = {
			publickey: testgame.publickey,
			achievement: "Super Mega Achievement #1",
			achievementkey: "secretkey",
			playerid: "1",
		};
		
		achievements.save(achievement, function(error, errorcode) {
			assert.notEqual(error, null);
			assert.equal(errorcode, errorcodes.NoPlayerName);

			achievement = {
				publickey: testgame.publickey,
				achievement: "Super Mega Achievement #1",
				achievementkey: "invalidkey",
				playername: "ben"
			};
			
			achievements.save(achievement, function(error, errorcode) {
				assert.notEqual(error, null);
				assert.equal(errorcode, errorcodes.NoPlayerId);

				achievement = {
					publickey: testgame.publickey,
					achievement: "Super Mega Achievement #1",
					playername: "ben",
					playerid: "1"
				};
				
				achievements.save(achievement, function(error, errorcode) {
					assert.notEqual(error, null);
					assert.equal(errorcode, errorcodes.NoAchievement);

					achievement = {
						publickey: testgame.publickey,
						achevementkey: "secretkey",
						playername: "ben",
						playerid: "1"
					};
					
					achievements.save(achievement, function(error, errorcode) {
                        assert.notEqual(error, null);
                        assert.equal(errorcode, errorcodes.NoAchievement);
						done();
					});
				});
			});
		});
    });
	
    it("Listing with no player or friends", function(done) {
		
		var options = {
			publickey: testgame.publickey,
		};

		achievements.list(options, function(error, errorcode, achievements) {
			assert.equal(error, null);
			assert.equal(errorcode, 0);
			assert.equal(achdata[testgame.publickey].achievements[0].achievement, "Super Mega Achievement #1");
			assert.equal(achdata[testgame.publickey].achievements[1].achievement, "Super Mega Achievement #2");
			assert.equal(achdata[testgame.publickey].achievements[2].achievement, "Super Mega Achievement #3");
			done();
		});
    });
	
    it("Listing with player", function(done) {
		
		var options = {
			publickey: testgame.publickey,
			playerid: "1"
		};

		achievements.list(options, function(error, errorcode, achievements) {
			assert.equal(error, null);
			assert.equal(errorcode, 0);
			assert.notEqual(achievements, null);
			assert.equal(achievements.length, 3);
			achievements.sort(function(a, b) {
				return a.name < b.name ? 1 : -1;
			});
			assert.equal(achievements[0].achievement, "Super Mega Achievement #1");
			assert.equal(achievements[1].achievement, "Super Mega Achievement #2");
			assert.equal(achievements[2].achievement, "Super Mega Achievement #3");
			assert.equal(achievements[0].hasOwnProperty("player"), true);
			assert.equal(achievements[1].hasOwnProperty("player"), false);
			assert.equal(achievements[2].hasOwnProperty("player"), false);
			assert.equal(achievements[0].player.playername, "ben");
			assert.equal(achievements[0].player.playerid, "1");	
			done();
		});
    });
	
    it("Listing with friends", function(done) {
		
		var achievement = {
			publickey: testgame.publickey,
			achievement: "Super Mega Achievement #1",
			achievementkey: "secretkey",
			playerid: "2",
			playername: "fred"
		};
		
		setTimeout(function() {
			achievements.save(achievement, function(error, errorcode) {
				assert.equal(error, null);
				assert.equal(errorcode, errorcodes.NoError);
				
				achievement = {
					publickey: testgame.publickey,
					achievement: "Super Mega Achievement #2",
					achievementkey: "secretkey2",
					playerid: "3",
					playername: "michelle"
				};
			
				setTimeout(function() {
					achievements.save(achievement, function(error, errorcode) {
		                assert.equal(error, null);
		                assert.equal(errorcode, errorcodes.NoError);
		
						var options = {
							publickey: testgame.publickey,
							friendslist: ["1", "2", "3"]
						};
		
						achievements.list(options, function(error, errorcode, achievements) {
							assert.equal(error, null);
							assert.equal(errorcode, 0);
							assert.equal(achievements[0].achievement, "Super Mega Achievement #1");
							assert.equal(achievements[1].achievement, "Super Mega Achievement #2");
							assert.equal(achievements[2].achievement, "Super Mega Achievement #3");
							assert.equal(achievements[0].hasOwnProperty("friends"), true);
							assert.equal(achievements[1].hasOwnProperty("friends"), true);
							assert.equal(achievements[2].hasOwnProperty("friends"), false);
							assert.equal(achievements[0].friends.length, 2);
							assert.equal(achievements[0].friends[0].playername, "ben");					
							assert.equal(achievements[0].friends[1].playername, "fred");
							assert.equal(achievements[1].friends.length, 1);
							assert.equal(achievements[1].friends[0].playername, "michelle");
							done();
						});
					});
				}, 2000);
			});
		}, 2000);
    });
	
    it("Listing with player and friends", function(done) { //nb: depends on prior test's data
		
		var options = {
			publickey: testgame.publickey,
			playerid: "1",
			friendslist: ["2", "3"]
		};

		achievements.list(options, function(error, errorcode, achievements) {
			assert.equal(error, null);
			assert.equal(errorcode, 0);
			
			achievements.sort(function(a, b) {
				return a.name < b.name ? 1 : -1;
			});
			
			assert.equal(achievements[0].achievement, "Super Mega Achievement #1");
			assert.equal(achievements[1].achievement, "Super Mega Achievement #2");
			assert.equal(achievements[2].achievement, "Super Mega Achievement #3");
			assert.equal(achievements[0].hasOwnProperty("player"), true);
			assert.equal(achievements[1].hasOwnProperty("player"), false);
			assert.equal(achievements[2].hasOwnProperty("player"), false);
			assert.equal(achievements[0].hasOwnProperty("friends"), true);
			assert.equal(achievements[1].hasOwnProperty("friends"), true);			
			assert.equal(achievements[2].hasOwnProperty("friends"), false);
			assert.equal(achievements[0].player.playername, "ben");			
			assert.equal(achievements[0].friends.length, 1);
			assert.equal(achievements[0].friends[0].playername, "fred");
			assert.equal(achievements[1].friends.length, 1);
			assert.equal(achievements[1].friends[0].playername, "michelle");
			
			// we need the next test to have a delay for different times
			done();
		});
    });
	
    it("Listing with player and friends and duplicate awards", function(done) {
		
		var achievement = {
			publickey: testgame.publickey,
			achievement: "Super Mega Achievement #1",
			achievementkey: "secretkey",
			playerid: "2",
			playername: "fred",
			fields: { 
				newer: true
			},
			allowduplicates: false
		};
		
		setTimeout(function() {
			achievements.save(achievement, function(error, errorcode) {
				assert.equal(error, null);
				assert.equal(errorcode, errorcodes.AlreadyHadAchievementNotSaved);
				
				achievement = {
					publickey: testgame.publickey,
					achievement: "Super Mega Achievement #2",
					achievementkey: "secretkey2",
					playerid: "3",
					playername: "michelle",
					fields: { 
						newer: true
					},
					allowduplicates: true
				};
				
				setTimeout(function() { 
					achievements.save(achievement, function(error, errorcode) {
	                    assert.equal(error, null);
	                    assert.equal(errorcode, errorcodes.AlreadyHadAchievementSaved);
	                    
						var options = {
							publickey: testgame.publickey,
							playerid: "1",
							friendslist: ["2", "3", "4"] // fakeid #4 forces an uncached lookup
						};
						
						achievements.list(options, function(error, errorcode, achievements) {
							assert.equal(error, null);
							assert.equal(errorcode, 0);
							
							achievements.sort(function(a, b) {
								return a.name < b.name ? 1 : -1;
							});
							
							assert.equal(achievements[0].achievement, "Super Mega Achievement #1");
							assert.equal(achievements[1].achievement, "Super Mega Achievement #2");
							assert.equal(achievements[2].achievement, "Super Mega Achievement #3");
							assert.equal(achievements[0].hasOwnProperty("player"), true);
							assert.equal(achievements[1].hasOwnProperty("player"), false);
							assert.equal(achievements[2].hasOwnProperty("player"), false);
							assert.equal(achievements[1].hasOwnProperty("friends"), true);			
							assert.equal(achievements[0].hasOwnProperty("friends"), true);
							assert.equal(achievements[2].hasOwnProperty("friends"), false);
							assert.equal(achievements[0].player.playername, "ben");			
							assert.equal(achievements[0].friends.length, 1);
							assert.equal(achievements[0].friends[0].playername, "fred");
							assert.equal(achievements[0].friends[0].hasOwnProperty("fields"), false);
							assert.equal(achievements[1].friends.length, 2);
							assert.equal(achievements[1].friends[1].playername, "michelle");
							assert.equal(achievements[1].friends[1].hasOwnProperty("fields"), true);
							assert.equal(achievements[1].friends[1].fields.newer, true);
							done();
						});
					});
				}, 3000);
			});
		}, 2000);
    });
	
    it("Streaming ungrouped with no player information", function(done) {
		
		var options = {
			publickey: testgame.publickey
		};

		achievements.stream(options, function(error, errorcode, items, numitems) {
			assert.equal(error, null);
			assert.equal(errorcode, 0);
			assert.equal(numitems, 4);
			assert.equal(items.length, 4);
			assert.equal(items[0].playername, "michelle");
			assert.equal(items[0].awarded.achievement, "Super Mega Achievement #2");
			assert.equal(items[1].playername, "michelle");
			assert.equal(items[1].awarded.achievement, "Super Mega Achievement #2");
			assert.equal(items[2].playername, "fred");
			assert.equal(items[2].awarded.achievement, "Super Mega Achievement #1");
			assert.equal(items[3].playername, "ben");
			assert.equal(items[3].awarded.achievement, "Super Mega Achievement #1");
			done();
		});
    });
	
    it("Streaming one player's information", function(done) {
		
		var options = {
			publickey: testgame.publickey,
			playerid: "1"
		};

		achievements.stream(options, function(error, errorcode, items, numitems) {
			assert.equal(error, null);
			assert.equal(errorcode, 0);
			assert.equal(numitems, 1);
			assert.equal(items.length, 1);			
			assert.equal(items[0].playername, "ben");
			assert.equal(items[0].awarded.achievement, "Super Mega Achievement #1");
			done();
		});
    });
	
    it("Streaming one friend's information", function(done) {
		
		var options = {
			publickey: testgame.publickey,
			friendslist: ["3"],
			perpage: 1
		};
		
		achievements.stream(options, function(error, errorcode, items, numitems) {
			assert.equal(error, null);
			assert.equal(errorcode, 0);
			assert.equal(numitems, 2);
			assert.equal(items.length, 1);
			assert.equal(items[0].playername, "michelle");
			assert.equal(items[0].awarded.achievement, "Super Mega Achievement #2");
			done();
		});
    });
	
    it("Streaming grouped with no player information", function(done) {
		
		var options = {
			publickey: testgame.publickey,
			group: true
		};
		
		achievements.stream(options, function(error, errorcode, items, numitems) {
			assert.equal(error, null);
			assert.equal(errorcode, 0);
			assert.equal(numitems, 3);
			assert.equal(items.length, 3);
			assert.equal(items[0].playername, "fred");
			assert.equal(items[0].awards, 1);
			assert.equal(items[0].achievements[0].achievement, "Super Mega Achievement #1");
			
			assert.equal(items[1].playername, "michelle");
			assert.equal(items[1].achievements[0].achievement, "Super Mega Achievement #2");
			assert.equal(items[1].awards, 2);
				
			assert.equal(items[2].playername, "ben");
			assert.equal(items[2].achievements[0].achievement, "Super Mega Achievement #1");
			assert.equal(items[2].awards, 1);
			done();
		});
    });
	
    it("Streaming grouped with player information", function(done) {
		
		var options = {
			publickey: testgame.publickey,
			playerid: "1",
			group: true
		};

		achievements.stream(options, function(error, errorcode, items, numitems) {
			assert.equal(error, null);
			assert.equal(errorcode, 0);
			assert.equal(numitems, 1);
			assert.equal(items.length, 1);
			assert.equal(items[0].playername, "ben");
			assert.equal(items[0].awards, 1);
			assert.equal(items[0].achievements[0].achievement, "Super Mega Achievement #1");
			done();
		});
    });
	
    it("Streaming grouped with player and friends' information", function(done) {
		
		var options = {
			publickey: testgame.publickey,
			playerid: "1",
			friendslist: ["2", "3"],
			group: true
		};
		
		achievements.stream(options, function(error, errorcode, items, numitems) {
			assert.equal(error, null);
			assert.equal(errorcode, 0);
			assert.equal(numitems, 3);
			assert.equal(items.length, 3);
			assert.equal(items[0].playername, "fred");
			assert.equal(items[0].awards, 1);
			assert.equal(items[0].achievements[0].achievement, "Super Mega Achievement #1");
				
			assert.equal(items[1].playername, "michelle");
			assert.equal(items[1].awards, 2);
			assert.equal(items[1].achievements[1].achievement, "Super Mega Achievement #2");
			
			assert.equal(items[2].playername, "ben");
			assert.equal(items[2].awards, 1);
			assert.equal(items[2].achievements[0].achievement, "Super Mega Achievement #1");
			
			done();
		});
    });
	
    it("V1 JSON structure (stream)", function(done) {

        var payload = {
            playerid: "1",
            publickey: testgame.publickey
        };
        
        v1.stream(payload, testgame.request, testgame.response, function(error, output) {
            
            assert.notEqual(output, null);
            var json;
            
            try {
                json = JSON.parse(output);
            } catch(s) {
            }
            
            assert.notEqual(json, null);
            assert.equal(json.errorcode, 0);
            assert.equal(json.success, true);
            assert.equal(json.achievements.length, 1);
            done();
        });
	});
	
    it("V1 JSON structure (list)", function(done) {

        var payload = {
            friendslist: ["1", "2,"],
            publickey: testgame.publickey
        };
        
        v1.list(payload, testgame.request, testgame.response, function(error, output) {
			
            assert.notEqual(output, null);
            var json;
            
            try {
                json = JSON.parse(output);
            } catch(s) {
            }
            
            assert.notEqual(json, null);
            assert.equal(json.errorcode, 0);
            assert.equal(json.success, true);
            assert.equal(json.achievements.length, 3);
            done();
        });
	});
	
    it("V1 JSON structure (save)", function(done) {

        var payload = {
			achievement: "Super Mega Achievement #2",
			achievementkey: "secretkey2",
			playerid: "4",
			playername: "ozdy",
			fields: { 
				newer: true
			},
			allowduplicates: true,
            publickey: testgame.publickey
        };
        
        setTimeout(function() {
	        v1.save(payload, testgame.request, testgame.response, function(error, output) {
				
	            assert.notEqual(output, null);
	            var json;
	            
	            try {
	                json = JSON.parse(output);
	            } catch(s) {
	            }
	            
	            assert.notEqual(json, null);
	            assert.equal(json.errorcode, 0);
	            assert.equal(json.success, true);
	            done();
	        });
        }, 2000);
	});
});