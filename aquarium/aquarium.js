// Setup stuff for event handling.
Function.prototype.bind = function(obj) {
    var method = this;
    return function() {
        args = [this];
        for(var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return method.apply(obj, args);
    }
}

// Namespace.

var aquarium = {};

//= webGLRenderer.js

// --- Convenience methods.
aquarium.create_fish = function(world, x, y, value) {
    // Create a fish and select its characterists from FishTypes based on its
    // value.
    var new_value = Math.min(aquarium.uniform(value / 2, value), 
            world.fish_types.length);
    var entry = world.fish_types[Math.floor(new_value)];
    var resource_id = entry[0];
    var resource = entry[1];

    var max_age = aquarium.uniform(resource.max_age[0], resource.max_age[1]);
    var energy = aquarium.uniform(resource.energy[0], resource.energy[1]);
    var avg_speed = aquarium.uniform(
            resource.avg_speed[0], resource.avg_speed[1]);
    var breed_time = aquarium.uniform(
            resource.breed_time[0], resource.breed_time[1]);

    return new aquarium.Boid(world,
            x, y, resource_id, new_value, max_age, energy, avg_speed, breed_time);
}

aquarium.distance = function(x, y) {
    // Returns the distance of a vector to the origin.
    return Math.sqrt(x * x + y * y);
}

aquarium.angle_between = function(a_x, a_y, b_x, b_y) {
    // Returns the angle between two vectors.
    var d = aquarium.distance(a_x, a_y) * aquarium.distance(b_x, b_y);
    if(d < 0.01) return 0;
    return Math.acos((a_x * b_x + a_y * b_y) / d);
}

aquarium.uniform = function(a, b) {
    // Convenience method to return a float between a and b.
    return a + Math.random() * (b - a);
}

aquarium.delta = function(p1, p2) {
    // Difference between two vectors.
    return new aquarium.Point(p2.x - p1.x, p2.y - p1.y);
}

aquarium.scale = function(p1, s) {
    // Returns a scaled instance of a vector.
    return new aquarium.Point(p1.x * s, p1.y * s);
}

// --- Classes.
aquarium.Point = function(x, y) {
    // A generic vector with some utility functions.
    this.x = x;
    this.y = y;

    this.len = function() {
        return aquarium.distance(this.x, this.y);
    }

    this.add = function(other) {
        this.x += other.x; this.y += other.y;
    }

    this.scale = function(a) {
        this.x *= a; this.y *= a;
        return this;
    }

    this.reset = function() {
        this.x = 0; this.y = 0;
    }

    this.normalize = function() {
        var l = this.len();

        if(l > 0.01) {
            this.x /= l; this.y /= l;
        } else {
            this.x = 0; this.y = 0;
        }
    }

    this.str = function() {
        return this.x.toFixed(2) + ", " + this.y.toFixed(2);
    }
}

aquarium.Entity = function(world, x, y, size, resource_id) {
    // The base class for visual objects like food, fishes and bubbles.
    this.type = undefined;

    this.world = world;
    this.pos = new aquarium.Point(x, y);
    this.size = size;
    this.direction = new aquarium.Point(0, 0);
    this.speed = 0;
    this.resource_id = resource_id;
    // TODO Mittelpunkt


    this.move = function() {
        this.pos.add(this.direction);
    }

    this.alive = function() {
        return true;
    }
}

aquarium.Feature = function(world, x, y, resource_id, callback) {
    aquarium.Entity.call(this, world, x, y, aquarium.uniform(20, 40), resource_id);
    this.type = aquarium.FeatureType;
    this.callback = callback;
}

aquarium.Food = function(world, x, y, resource_id) {
    // Food to be eaten by fishes.
    aquarium.Entity.call(this, world, x, y, uniform(0.5, 1), resource_id);
    this.type = aquarium.FoodType;

    this.direction = new aquarium.Point(0, 1);
    this.speed = uniform(2.5, 7.5);

    this.alive = function() {
        return (
            this.size > 0 &&
            this.pos.y < (plasmoid.rect.height * 0.5) * 0.9
        );
    }

    this.eat = function() {
        var amount = Math.min(this.size, 0.1);
        this.size -= amount;
        this.resize();
        return amount * 50;
    }
}

aquarium.Bubble = function(world, x, y, resource_id) {
    // Just a bubble.
    aquarium.Entity.call(this, world, x, y, uniform(0.5, 1), resource_id);

    this.type = aquarium.BubbleType;

    this.direction = new aquarium.Point(0, -1);
    this.speed = uniform(10, 30);

    this.alive = function() {
        return this.pos.y > -(this.world.height * 0.5) * 0.9;
    }
}

aquarium.Boid = function(world, x, y, pixmap, value, max_age, energy, average_speed,
        breed_time) {
    // A boid that models the fishes behavior.
    aquarium.Entity.call(this, world, x, y, MinBoidSize, pixmap);

    this.value = value;
    this.average_speed = average_speed;
    this.energy = energy;
    this.max_age = max_age;
    this.breed_time = breed_time;
    this.type = aquarium.BoidType;

    this.acceleration = 0;
    this.speed = this.average_speed;
    this.age = 0;
    this.next_breed = this.breed_time;
    this.age_stage = 0;

    this.size = 30.;
    this.fov_radius = this.size * 5;

    this.sex = Math.random() > 0.5 ? Female : Male;

    this.randomize_step = 0;
    this.food_target = undefined;
    this.courtshipping = undefined;

    this.separation = new aquarium.Point(0, 0);
    this.cohesion = new aquarium.Point(0, 0);
    this.alignment = new aquarium.Point(0, 0);

    this.paint_entity = this.paint;

    this.paint = function(painter) {
        this.paint_entity(painter);

        if(!ShowInfo) return;

        r = this.fov_radius;

        if(this.visible > 0)
            painter.pen = red_pen;
        painter.drawEllipse(-r, -r, r*2, r*2);
        painter.pen = red_pen;
        painter.drawLine(0, 0, this.separation.x * r, this.separation.y * r);
        painter.pen = blue_pen;
        painter.drawLine(0, 0, this.cohesion.x * r, this.cohesion.y * r);
        painter.pen = green_pen;
        painter.drawLine(0, 0, this.alignment.x * r, this.alignment.y * r);
        painter.pen = white_pen;
        painter.drawLine(0, 0, this.direction.x * r, this.direction.y * r);
    }

    this.perceives = function(other, dist) {
        if(dist > this.fov_radius) return false;

        var fov_angle = aquarium.angle_between(
                -this.direction.x, -this.direction.y,
                other.pos.x - this.pos.x, other.pos.y - this.pos.y);

        return fov_angle > 0.4;
    }

    this.think = function(neighbors) {
        var separation = new aquarium.Point(0, 0);
        var cohesion = new aquarium.Point(0, 0);
        var alignment = new aquarium.Point(0, 0);

        var visible = 0;
        var other_courtshipping = undefined;
        var food_target_dist = undefined;

        for(var i=0, info; info=neighbors[i]; i++) {
            var other = info[0], dist = info[1];

            switch(other.type) {
                case aquarium.BoidType:
                    if(other.courtshipping == this) {
                        other_courtshipping = this;
                    } else if(this.next_breed == 0 && this.energy > 0) {
                        if(
                                this.courtshipping == undefined &&
                                other.sex != this.sex) {
                            this.courtshipping = other;
                        }
                    }

                    // Flocking behaviour ignores fishes of a different species.
                    if(Math.floor(this.value) != Math.floor(other.value)) {
                        continue;
                    }
                    visible++;

                    // Separation
                    if(dist < 0.01) {
                        separation.x += Math.random();
                        separation.y += Math.random();
                    } else {
                        separation.add(
                                aquarium.delta(other.pos, this.pos).scale(
                                        1 / dist - 1 / this.fov_radius));
                    }

                    // Cohesion
                    cohesion.add(
                            aquarium.delta(this.pos, other.pos).scale(
                                    1 / this.fov_radius));

                    // Alignment
                    alignment.add(other.direction);
                break;
                case aquarium.FoodType:
                    if(
                            this.food_target == undefined || 
                            food_target_dist > dist) {
                        this.food_target = other;
                        food_target_dist = dist;
                    }
                break;
            }
        }

        var direction = new aquarium.Point(0, 0);

        // Direction from flocking behaviour.
        if(visible > 0) {
            direction.add(new aquarium.Point(
                    (separation.x + cohesion.x + alignment.x) / (3 * visible),
                    (separation.y + cohesion.y + alignment.y) / (3 * visible)));
        } else {
            direction.add(this.direction);
        }

        if(this.randomize_step > 0) {
            this.randomize_step--;
        } else {
            this.randomize_step = 10 + Math.floor(Math.random() * 10);
            var explore_dir = new aquarium.Point(
                    (0.5 - Math.random()) * 2, (0.5 - Math.random()) * 2);
            direction.scale(0.2).add(explore_dir.scale(0.8));

            this.acceleration += (0.5 - Math.random()) * 0.5;
        }

        if(this.food_target != undefined) {
            var food_dir = delta(this.pos, this.food_target.pos);
            direction.scale(0.4).add(food_dir.scale(0.6));
            this.acceleration = 1;

            // Eat.
            if(food_dir.len() < this.size) {
                amount = this.food_target.eat();
                this.food_target = undefined;
                this.energy += amount;
            } else if(!this.food_target.alive()) {
                this.food_target = undefined;
            }
        }

        if(other_courtshipping != undefined) {
            var flee_dir = delta(this.pos, other_courtshipping.pos).scale(-1);
            direction.scale(0.1).add(flee_dir.scale(0.9));
            this.acceleration = 1;
        }

        if(this.courtshipping != undefined) {
            var chase_dir = delta(this.pos, this.courtshipping.pos);
            direction.scale(0.1).add(chase_dir.scale(0.9));
            this.acceleration = 1;
            if(this.energy <= 0) {
                this.courtshipping = undefined;
            } else if(chase_dir.len() < this.size) {
                this.next_breed = this.breed_time;
                // Only add new boids if the upper limit is not reached.
                if(world.entities.length < world.max_entities) {
                    world.add_entity(create_fish(
                            this.pos.x, this.pos.y,
                            this.value + this.courtshipping.value));
                }
                this.courtshipping = undefined;
            }
        }

        // Force boids back to the center of the fishbowl if they are to close
        // to the edge.
        var dist_center = this.pos.len();
        var rel_dist_center = dist_center /
                (Math.min(this.world.width, this.world.height) * 0.5);

        if(rel_dist_center > 0.9) {
            direction = aquarium.scale(this.pos, -1);
        }

        // Acceleration is decreasing over time.
        this.acceleration *= 0.9;

        this.speed = 0.5 * this.speed +
            this.average_speed * (1 + this.acceleration * 0.5) * 0.5;
        this.energy = Math.max(0, this.energy - this.speed);
        if(this.energy == 0)
            this.speed = Math.min(this.average_speed, this.speed);

        // Normalize direction.
        direction.normalize();

        // y doesn't sum up to one which will let the boids tend to swim
        // horizontally.
        this.direction.x = 0.75 * this.direction.x + 0.25 * direction.x;
        this.direction.y = 0.75 * this.direction.y + 0.225 * direction.y;

        this.age++;
        if(Math.ceil((this.age / this.max_age) * AgeStages) > this.age_stage) {
            this.age_stage++;
            this.size = 20 * (MinBoidSize +
                (1 - MinBoidSize) * this.age_stage / AgeStages);
        }

        this.next_breed--;

        // Store values just in case they should be visualized.
        this.separation = separation;
        this.cohesion = cohesion;
        this.alignment = alignment;
    }

    this.str = function() {
        return "(" + this.pos.str() + ")";
    }

    this.alive = function() {
        return this.age < this.max_age;
    }
}

aquarium.FeatureType = 0;
aquarium.BoidType = 1;
aquarium.FoodType = 2;
aquarium.BubbleType = 3;

aquarium.World = function(renderer) {
    this.renderer = renderer;
    this.width = renderer.canvas.width;
    this.height = renderer.canvas.height;

    // Constants.
    var BubbleTime = 2000;
    var MinAutofeedTime = 2000, MaxAutofeedTime = 5000;
    var AutoBuyLimit = 15, AutobuyTime = 2000;

    Male = 0; Female = 1;
    MinBoidSize = 0.5;
    AgeStages = 10;
    ShowInfo = false;

    // Container for all entities.
    this.entities = [];
    this.new_entities = [];
    this.distances = [];

    this.features = [];

    this.max_entities = undefined;
    this.update_timestep = 1 / 10;

    this.create_default_fish = function() {
        var x_max = this.width / 2;
        var y_max = this.height / 2;
        var fish = aquarium.create_fish(this,
                aquarium.uniform(-x_max, x_max), aquarium.uniform(-y_max, y_max),
                Math.random());
        return fish;
    }

    this.get_distance = function(a, b) {
        // Returns the distance from entity with index a to the entity with
        // index b.
        if(a > b) {
            var t = a;
            a = b;
            b = t;
        }

        index = (a * (this.entities.length - 1) -
                Math.floor((a - 1) * a * 0.5) + b - a - 1);

        return this.distances[index];
    }

    this.step = function() {
        // Collect dead entities.
        var dead = [];

        for(var i=0, entity; entity=this.entities[i]; i++) {
            if(entity.alive()) continue;

            dead.push(i);
        }

        dead.reverse();
        // Strange, this doesn't work with the above iteration style.
        for(var i=0; i<dead.length; i++) {
            this.entities.splice(dead[i], 1);
        }

        // Add new entities.
        for(var i=0,entity; entity=this.new_entities[i]; i++) {
            this.entities.push(entity);
        }
        this.new_entities = [];

        // Update distances between entities.
        this.distances = [];

        if(this.entities.length == 0) return;

        for(var a=0, boid_a; boid_a=this.entities[a]; a++) {
            for(var b=a+1, boid_b; boid_b=this.entities[b]; b++) {
                // Calculate distance between boid a and b.
                this.distances.push(aquarium.delta(boid_a.pos, boid_b.pos).len());
           }
        }

        for(var i=0, entity; entity=this.entities[i]; i++) {
            // Ignore entities which can't think.
            if(entity.think == undefined) continue;

            var neighbors = [];

            for(var j=0, other; other=this.entities[j]; j++) {
                if(other == entity) continue;
                dist = this.get_distance(i, j);
                if(!entity.perceives(other, dist)) continue;

                neighbors.push([other, dist]);
            }

            entity.think(neighbors);
        }

        return 10;
    }

    this.render = function() {
        for(var i=0, entity; entity=this.entities[i]; i++) {
            entity.pos.add(aquarium.scale(
                    entity.direction, entity.speed * this.update_timestep));
        }
    }
        
    this.add_entity = function(entity) {
        this.new_entities.push(entity);
    }

    this.count_fishes = function() {
        var count = 0;
        for(var i = 0, e; e = this.entities[i]; i++) {
            if(e.think != undefined) {
                count++;
            }
        }
        return count;
    }

    this.rebuild_features = function(feature_count) {
        // Calculate sum of weights.
        var sum_weights = 0;
        for(var i = 0,f; f=this.feature_types[i]; i++) {
            sum_weights += f[1].probability;
        }

        // Rebuild features.
        var vary_x = (1 / feature_count) * 0.5;
        for(var i = 0; i < feature_count; i++) {
            // Select a feature index i.
            var j, r = aquarium.uniform(0, sum_weights), current = 0;
            for(j = 0; j < this.feature_types.length; j++) {
                current += this.feature_types[j][1].probability;
                if(r <= current) break;
            }

            var pos_x = (i / feature_count + vary_x * Math.random()) *
                    this.width - this.width / 2;

            this.add_entity(new aquarium.Feature(this,
                        pos_x, this.height / 2, this.feature_types[j][0]));
        }
    }

    this.autobuy = function() {
        if(this.count_fishes() < AutoBuyLimit) {
            this.add_entity(create_default_fish());
        }
        return 20;
    }

    this.mousedownhandler = function() {
        console.log('click');
        this.renderer.addEventListener('onmousemotion',
                this.mousemotionhandler.bind(this))
    }

    this.mouseuphandler = function() {
        console.log('click');
        this.renderer.removeEventListener('onmousemotion',
                this.mousmotionhandler.bind(this))
    }

    this.mousemotionhandler = function(evt) {
        console.log('motion ' + evt);
    }

    this.initialize = function(renderer) {
        this.renderer = renderer
        this.renderer.addEventListener('onmousedown',
                this.mousedownhandler.bind(this));
        this.renderer.addEventListener('onmouseup',
                this.mouseuphandler.bind(this));
    }

    this.setup = function() {
        this.feature_types = [];
        this.fish_types = [];

        for(var type in this.renderer.resource.entries.types) {
            var types = this.renderer.resource.entries.types[type];

            if(type == 'fish') {
                console.log(types);
                for(var name in types) { 
                    var entry = types[name];
                    this.fish_types.push([name, entry]);
                }
            } else if(type == 'feature') {
                for(var name in types) { 
                    var entry = types[name];
                    this.feature_types.push([name, entry]);
                }
            }
        }
        this.rebuild_features(10);

        // Add initial fishes.
        console.log('adding fishes ' + AutoBuyLimit);
        for(var i = 0; i < AutoBuyLimit; i++) {
            this.add_entity(this.create_default_fish());
        }

        this.renderer.setup();
    }
}

aquarium.Renderer = function(root) {
    // FIXME Ugly
    var requestAnimationFrame = window.requestAnimationFrame       || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame    || 
        window.oRequestAnimationFrame      || 
        window.msRequestAnimationFrame     || 
        function( callback ){
            window.setTimeout(callback, 1000 / 60);
        };
    this.world = undefined;

    this.steppers = [];

    this.add_frame_callback = function(func) {
        this.steppers.push([0, func]);
    }

    this.current_frame = 0;

    this.last_time = Date.now();

    this.frame = function() {
        // Steps through the world.
        var time = Date.now();
        while(time - this.last_time >= 20) {
            this.last_time += 20;

            for(var i = 0, stepper; stepper = this.steppers[i]; i++) {
                if(this.current_frame >= stepper[0]) {
                    stepper[0] += stepper[1]();
                }
            }
            this.current_frame++;
        }
        requestAnimationFrame(this.frame.bind(this));
    }

    this.addEventListener = function(name, callback) {
        this.canvas.addEventListener(name, callback, false);
    }
    this.removeEventListener = function(name, callback) {
        this.canvas.removeEventListener(name, callback, false);
    }

    this.initialize = function(world, data) {
        this.world = world;
        this.world.initialize(this);
        this.add_frame_callback(this.world.step.bind(this.world));

        this.resource.load(data);
        this.resource.callback = this.world.setup.bind(this.world);
    }

    this.setup = function() {
        this.frame();
    }

    this.resource = new Resource(root);
}

aquarium.CanvasRenderer = function(canvas_id, root) {
    aquarium.Renderer.call(this, root);
    this.canvas = document.getElementById(canvas_id);
    this.context = this.canvas.getContext('2d');

    this.render = function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.world.render();
        for(var i = 0, e; e = this.world.entities[i]; i++) {
            console.log(this.resource.entries.textures);
            var img = this.resource.entries.textures[e.resource_id];

            var scale = e.size / Math.max(img.width, img.height);
            if(e.type != aquarium.FeatureType) {
                this.context.drawImage(img, 0, 0, img.width, img.height,
                        this.world.width * 0.5 + e.pos.x + img.width * 0.5 * scale,
                        this.world.height * 0.5 + e.pos.y + img.height * 0.5 * scale,
                        img.width * scale, img.height * scale);
            } else {
                this.context.drawImage(img, 0, 0, img.width, img.height,
                        this.world.width * 0.5 + e.pos.x + img.width * 0.5 * scale,
                        this.world.height * 0.5 + e.pos.y - img.height * scale,
                        img.width * scale, img.height * scale);
            }
        }

        // Draw boids
        /*gl.useProgram();
        for(var i=0, e; e = this.world.entities[i]; i++) {
            if(e.type != BoidType) continue

            gl.drawArrays();
        }
        gl.teardown();*/

        return 2;
    }

    this.add_frame_callback(this.render.bind(this));
}

Resource = function(root) {
    this.entries = {};
    this.to_load = [];
    this.callback = null;

    this.img_loaded = function(img, name) {
        this.entries.textures[name] = img;
        this.count--;

        if(this.count == 0) {
            // Remove buffers.
            if(this.callback != null)
                this.callback();
        }
    }

    this.load = function(data) {
        this.entries = data;
        this.count = 0;
        console.log(data);
        for(var name in data.textures) {
            console.log(name);
            var entry = data.textures[name];
            var img = new Image();
            // FIXME UUUUGGGLLLYYY
            var that = this;
            img.onload = (function(name, thatimg) { 
                return function(evt) {
                    that.img_loaded(thatimg, name);
                };
            })(name, img);
            img.src = root + name + '.png';
            this.count++;
        }
    }
}

aquarium.run = function(canvas_id, root) {
    var renderer = new aquarium.WebGLRenderer(canvas_id, root);
    var world = new aquarium.World(renderer);
    renderer.initialize(world, data);
}
