(function() {
    gd.markup = function() {

        var markup = {};

        markup.parseAll = function ( selection )
        {
            var models = [];
            selection.each( function ()
            {
                models.push( markup.parse( d3.select( this ) ) );
            } );
            return models;
        };

        function copyStyle( entity, computedStyle, cssPropertyKey, backupCssPropertyKey )
        {
            var propertyValue = computedStyle.getPropertyValue( cssPropertyKey );
            if ( !propertyValue )
            {
                propertyValue = computedStyle.getPropertyValue( backupCssPropertyKey );
            }
            entity.style( cssPropertyKey, propertyValue );
        }

        function copyStyles( entity, markup )
        {
            var computedStyle = window.getComputedStyle(markup.node() );
            copyStyle( entity, computedStyle, "width" );
            copyStyle( entity, computedStyle, "min-width" );
            copyStyle( entity, computedStyle, "font-family" );
            copyStyle( entity, computedStyle, "font-size" );
            copyStyle( entity, computedStyle, "margin", "margin-top" );
            copyStyle( entity, computedStyle, "padding", "padding-top" );
            copyStyle( entity, computedStyle, "color" );
            copyStyle( entity, computedStyle, "background-color" );
            copyStyle( entity, computedStyle, "border-width", "border-top-width" );
            copyStyle( entity, computedStyle, "border-style", "border-top-style" );
            copyStyle( entity, computedStyle, "border-color", "border-top-color" );
        }

        markup.parse = function(selection) {
            var model = gd.model();

            if (selection.attr("data-internal-scale")) {
                model.internalScale(selection.attr("data-internal-scale"));
            }
            if (selection.attr("data-external-scale")) {
                model.externalScale(selection.attr("data-external-scale"));
            }

            var nodePrototype = selection.append("li" ).attr("class", "node");
            var nodePropertiesPrototype = nodePrototype.append("dl" ).attr("class", "properties");
            copyStyles(model.stylePrototype.node, nodePrototype);
            copyStyles(model.stylePrototype.nodeProperties, nodePropertiesPrototype);
            nodePrototype.remove();

            var relationshipPrototype = selection.append("li" ).attr("class", "relationship");
            var relationshipPropertiesPrototype = relationshipPrototype.append("dl" ).attr("class", "properties");
            copyStyles(model.stylePrototype.relationship, relationshipPrototype);
            copyStyles(model.stylePrototype.relationshipProperties, relationshipPropertiesPrototype);
            relationshipPrototype.remove();

            function parseProperties(entity)
            {
                return function() {
                    var propertiesMarkup = d3.select( this );

                    var elements = propertiesMarkup.selectAll( "dt, dd" );
                    var currentKey;
                    elements.each( function ()
                    {
                        if ( this.nodeName.toLowerCase() === "dt" )
                        {
                            currentKey = d3.select( this ).text();
                        } else if ( currentKey && this.nodeName.toLowerCase() === "dd" )
                        {
                            entity.properties().set( currentKey, d3.select( this ).text() );
                        }
                    } );

                    copyStyles(entity.properties(), propertiesMarkup);
                }
            }

            selection.selectAll(".node").each(function () {
                var nodeMarkup = d3.select(this);
                var id = nodeMarkup.attr("data-node-id");
                var node = model.createNode(id);
                node.class(nodeMarkup.attr("class") || "");
                node.x(nodeMarkup.attr("data-x"));
                node.y(nodeMarkup.attr("data-y"));
                nodeMarkup.select("span.caption").each(function() {
                    node.caption(d3.select(this).text());
                });
                nodeMarkup.select( "dl.properties" ).each( parseProperties( node ) );

                copyStyles(node, nodeMarkup);
            });

            selection.selectAll(".relationship").each(function () {
                var relationshipMarkup = d3.select(this);
                var fromId = relationshipMarkup.attr("data-from");
                var toId = relationshipMarkup.attr("data-to");
                var relationship = model.createRelationship(model.lookupNode(fromId), model.lookupNode(toId));
                relationship.class(relationshipMarkup.attr("class") || "");
                relationshipMarkup.select("span.type" ).each(function() {
                    relationship.relationshipType(d3.select(this).text());
                });
                relationshipMarkup.select( "dl.properties" ).each( parseProperties( relationship ) );

                copyStyles(relationship, relationshipMarkup);
            });

            return model;
        };

        markup.format = function(model, container) {
            var ul = container.append("ul")
                .attr("class", "graph-diagram-markup")
                .attr("data-internal-scale", model.internalScale())
                .attr("data-external-scale", model.externalScale());

            function formatProperties( entity, li )
            {
                if ( entity.properties().list().length > 0 )
                {
                    var dl = li.append( "dl" )
                        .attr( "class", "properties" );

                    entity.properties().list().forEach( function ( property )
                    {
                        dl.append( "dt" )
                            .text( property.key );
                        dl.append( "dd" )
                            .text( property.value );
                    } );
                }
            }

            model.nodeList().forEach(function(node) {
                var li = ul.append("li")
                    .attr("class", node.class().join(" "))
                    .attr("data-node-id", node.id)
                    .attr("data-x", node.x())
                    .attr("data-y", node.y());

                if (node.caption()) {
                    li.append("span")
                        .attr("class", "caption")
                        .text(node.caption());
                }
                formatProperties( node, li );
            });

            model.relationshipList().forEach(function(relationship) {
                var li = ul.append("li")
                    .attr("class", relationship.class().join(" "))
                    .attr("data-from", relationship.start.id)
                    .attr("data-to", relationship.end.id);

                if (relationship.relationshipType()) {
                    li.append("span")
                        .attr("class", "type")
                        .text(relationship.relationshipType());
                }
                formatProperties( relationship, li );
            });
        };

        return markup;
    }();
})();