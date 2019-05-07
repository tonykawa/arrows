(function() {
    gd.model = function() {

        var nodes = {},
            relationships = [],
            highestId = 0,
            internalScale = 1,
            externalScale = 1;

        var model = {};

        var styleSet = function(stylePrototype) {
            var styles = {};

            if (stylePrototype)
            {
                var styleMap = stylePrototype.style();
                for ( var key in styleMap )
                {
                    if ( styleMap.hasOwnProperty( key ) )
                    {
                        styles[key] = styleMap[key];
                    }
                }
            }

            return function(cssPropertyKey, cssPropertyValue)
            {
                if (arguments.length == 2) {
                    styles[cssPropertyKey] = cssPropertyValue;
                    return this;
                }
                if (arguments.length == 1) {
                    return styles[cssPropertyKey];
                }
                return styles;
            };
        };

        var Node = function() {
            var position = {};
            var type; // waypoint & task
            var prototypePosition;
            var caption;
            var classes = [];
            var properties = new Properties(model.stylePrototype.nodeProperties);
            var isRectangle = false;

            this.type = function(typeField) {
                if (arguments.length == 1) {
                    type = typeField;
                    return this;
                }
                return type;
            }

            this.class = function(classesString) {
                if (arguments.length == 1) {
                    classes = classesString.split(" ").filter(function(className) {
                        return className.length > 0 && className != "node";
                    });
                    return this;
                }
                return ["node"].concat(classes);
            };

            this.x = function(x) {
                if (arguments.length == 1) {
                    position.x = Number(x);
                    return this;
                }
                return position.x;
            };

            this.y = function(y) {
                if (arguments.length == 1) {
                    position.y = Number(y);
                    return this;
                }
                return position.y;
            };

            this.ex = function() {
                return position.x * internalScale;
            };

            this.ey = function() {
                return position.y * internalScale;
            };

            this.distanceTo = function(node) {
                var dx = node.x() - this.x();
                var dy = node.y() - this.y();
                return Math.sqrt(dx * dx + dy * dy) * internalScale;
            };

            function snap( position, field, node )
            {
                var ideal = position[field];
                var closestNode;
                var closestDistance = Number.MAX_VALUE;
                for (var nodeId in nodes) {
                    if (nodes.hasOwnProperty(nodeId)) {
                        var candidateNode = nodes[nodeId];
                        if ( candidateNode != node )
                        {
                            var distance = Math.abs(candidateNode[field]() - ideal);
                            if (distance < closestDistance)
                            {
                                closestNode = candidateNode;
                                closestDistance = distance;
                            }
                        }
                    }
                }
                if (closestDistance < gd.parameters.snapTolerance)
                {
                    return closestNode[field]();
                }
                else
                {
                    return position[field];
                }
            }

            this.drag = function(dx, dy) {
                if (!prototypePosition)
                {
                    prototypePosition = {
                        x: position.x,
                        y: position.y
                    }
                }
                prototypePosition.x += dx / internalScale;
                prototypePosition.y += dy / internalScale;
                position.x = snap(prototypePosition, "x", this);
                position.y = snap(prototypePosition, "y", this);
            };

            this.dragEnd = function()
            {
                prototypePosition = undefined;
            };

            this.distance = function() {
                var dx = node.x() - this.x();
                var dy = node.y() - this.y();
                return Math.sqrt(dx * dx + dy * dy) * internalScale;
            };

            this.angleTo = function(node) {
                var dx = node.x() - this.x();
                var dy = node.y() - this.y();
                return Math.atan2(dy, dx) * 180 / Math.PI
            };

            this.isLeftOf = function(node) {
                return this.x() < node.x();
            };

            this.caption = function(captionText) {
                if (arguments.length == 1) {
                    caption = captionText;
                    return this;
                }
                return caption;
            };

            this.properties = function() {
                return properties;
            };

            this.isRectangle = function(choice) {
                //swap between shapes
                if (arguments.length == 1) {
                    isRectangle = choice;
                    return isRectangle;
                }
                return isRectangle;
            };

            this.style = styleSet(model.stylePrototype.node);
        };

        var Relationship = function(start, end) {
            var relationshipType;
            var classes = [];
            var properties = new Properties(model.stylePrototype.relationshipProperties);

            this.class = function(classesString) {
                if (arguments.length == 1) {
                    classes = classesString.split(" ").filter(function(className) {
                        return className.length > 0 && className != "relationship";
                    });
                    return this;
                }
                return ["relationship"].concat(classes);
            };

            this.relationshipType = function(relationshipTypeText) {
                if (arguments.length == 1) {
                    relationshipType = relationshipTypeText;
                    return this;
                }
                return relationshipType;
            };

            this.start = start;
            this.end = end;

            this.reverse = function() {
                var oldStart = this.start;
                this.start = this.end;
                this.end = oldStart;
            };

            this.properties = function() {
                return properties;
            };

            this.style = styleSet(model.stylePrototype.relationship);
        };

        var Properties = function(stylePrototype) {
            var keys = [];
            var values = {};

            this.list = function() {
                return keys.map(function (key) {
                    return { key: key, value: values[key] };
                });
            };

            this.set = function(key, value) {
                if (!values[key]) {
                    keys.push(key);
                }
                values[key] = value;
                return this;
            };

            this.clearAll = function() {
                keys = [];
                values = {};
            };

            this.style = styleSet(stylePrototype);
        };

        function generateNodeId() {
            while (nodes[highestId]) {
                highestId++;
            }
            return highestId;
        }

        model.createNode = function(optionalNodeId) {
            var nodeId = optionalNodeId || generateNodeId();
            var node = new Node();
            node.id = nodeId;
            nodes[nodeId] = node;
            return node;
        };

        model.deleteNode = function(node) {
            relationships = relationships.filter(function (relationship) {
                return !(relationship.start === node || relationship.end == node);
            });
            delete nodes[node.id];
        };

        model.deleteRelationship = function(relationship) {
            relationships.splice(relationships.indexOf(relationship), 1);
        };

        model.createRelationship = function(start, end) {
            var relationship = new Relationship(start, end);
            relationships.push(relationship);
            return relationship;
        };

        model.nodeList = function() {
            var list = [];
            for (var nodeId in nodes) {
                if (nodes.hasOwnProperty(nodeId)) {
                    list.push(nodes[nodeId]);
                }
            }
            return list;
        };

        model.lookupNode = function(nodeId) {
            return nodes[nodeId];
        };

        model.relationshipList = function() {
            return relationships;
        };

        model.groupedRelationshipList = function() {
            var groups = {};
            for (var i = 0; i < relationships.length; i++)
            {
                var relationship = relationships[i];
                var nodeIds = [relationship.start.id, relationship.end.id].sort();
                var group = groups[nodeIds];
                if (!group)
                {
                    group = groups[nodeIds] = [];
                }
                if (relationship.start.id < relationship.end.id)
                {
                    group.push(relationship);
                }
                else
                {
                    group.splice(0, 0, relationship);
                }
            }
            return d3.values(groups);
        };

        model.internalScale = function(newScale) {
            if (arguments.length == 1) {
                internalScale = parseFloat(newScale);
                return this;
            }
            return internalScale;
        };

        model.externalScale = function(newScale) {
            if (arguments.length == 1) {
                externalScale = parseFloat(newScale);
                return this;
            }
            return externalScale;
        };

        var SimpleStyle = function() {
            this.style = styleSet();
        };

        model.stylePrototype = {
            node: new SimpleStyle(),
            nodeProperties: new SimpleStyle(),
            relationship: new SimpleStyle(),
            relationshipProperties: new SimpleStyle()
        };

        return model;
    };
})();