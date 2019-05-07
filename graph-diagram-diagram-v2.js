(function() {
    gd.diagram = function()
    {
        var overlay = function(layoutModel, view) {};
        var scaling = gd.scaling.sizeSvgToFitDiagram;

        function field( fileName )
        {
            return function ( d )
            {
                return d[fileName];
            }
        }

        function singleton(d) {
            return [d];
        }

        function renderNodes( nodes, view )
        {
            function nodeClasses(d) {
                return d.model.class().join(" ") + " " + "node-id-" + d.model.id;
            }

            var rectangles = view.selectAll("rect.node")
                .data(nodes);

            rectangles.exit().remove();

            rectangles.enter().append("svg:rect")
                .attr("class",nodeClasses);

            rectangles
                .attr("width", function(node) { 
                    return node.radius.mid() * 2;
                })
                .attr("height", function(node) {
                    return node.radius.mid() * 2;
                })
                .attr("fill", function(node) {
                    return node.model.style("background-color");
                })
                .attr("stroke", function(node) {
                    return node.model.style("border-color");
                })
                .attr("stroke-width", function(node) {
                    return node.model.style("border-width");
                })
                .attr("rx", function(node) {
                    if(node.model.isRectangle())
                        return "30";
                    else
                        return node.radius.mid();
                }) 
                .attr("ry", function(node) {
                    if(node.model.isRectangle())
                        return "30";
                    else
                        return node.radius.mid();
                }) 
                .attr("x", function(node) {
                    return node.x - node.radius.inside();
                })
                .attr("y", function(node) {
                    return node.y - node.radius.inside();
                }); 


            function captionClasses(d) {
                return "caption " + d.node.model.class();
            }

            var captionGroups = view.selectAll("g.caption")
                .data(nodes.filter(function(node) { return node.model.caption(); }));

            captionGroups.exit().remove();

            captionGroups.enter().append("g")
                .attr("class", "caption");

            var captions = captionGroups.selectAll("text.caption")
                .data( function ( node )
                {
                    return node.captionLines.map( function ( line )
                    {
                        return { node: node, caption: line }
                    } );
                } );

            captions.exit().remove();

            captions.enter().append("svg:text")
                .attr("class", captionClasses)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "central");

            captions
                .attr("x", function ( line ) { return line.node.model.ex(); })
                .attr("y", function ( line, i ) { return line.node.model.ey() + (i - (line.node.captionLines.length - 1) / 2) * line.node.captionLineHeight; })
                .attr( "fill", function ( line ) { return line.node.model.style( "color" ); } )
                .attr( "font-size", function ( line ) { return line.node.model.style( "font-size" ); } )
                .attr( "font-family", function ( line ) { return line.node.model.style( "font-family" ); } )
                .text(function(d) { return d.caption; });
        }

        function renderRelationships( relationshipGroups, view )
        {
            function translateToStartNodeCenterAndRotateToRelationshipAngle(r) {
                var angle = r.start.model.angleTo(r.end.model);
                return "translate(" + r.start.model.ex() + "," + r.start.model.ey() + ") rotate(" + angle + ")";
            }

            function rotateIfRightToLeft(r) {
                return r.end.model.isLeftOf( r.start.model ) ? "rotate(180)" : null;
            }

            function side(r) {
                return r.end.model.isLeftOf(r.start.model) ? -1 : 1;
            }

            function relationshipClasses(d) {
                var r = d.model;
                return r.class().join(" ");
            }

            var relatedNodesGroup = view.selectAll("g.related-pair")
                .data(relationshipGroups);

            relatedNodesGroup.exit().remove();

            relatedNodesGroup.enter().append("svg:g")
                .attr("class", "related-pair");

            var relationshipGroup = relatedNodesGroup.selectAll( "g.relationship" )
                .data( function(d) { return d; } );

            relationshipGroup.exit().remove();

            relationshipGroup.enter().append("svg:g")
                .attr("class", relationshipClasses);

            relationshipGroup
                .attr("transform", translateToStartNodeCenterAndRotateToRelationshipAngle);

            var relationshipPath = relationshipGroup.selectAll("path.relationship")
                .data(singleton);

            relationshipPath.enter().append("svg:path")
                .attr("class", relationshipClasses);

            relationshipPath
                .attr( "d", function(d) { return d.arrow.outline; } )
                .attr( "fill", function(node) {
                    return node.model.style("background-color");
                })
                .attr("stroke", function(node) {
                    return node.model.style("border-color");
                })
                .attr("stroke-width", function(node) {
                    return node.model.style("border-width");
                });

            function relationshipWithRelationshipType(d) {
                return [d].filter(function(d) { return d.model.relationshipType(); });
            }

            var relationshipType = relationshipGroup.selectAll("text.type")
                .data(relationshipWithRelationshipType);

            relationshipType.exit().remove();

            relationshipType.enter().append("svg:text")
                .attr("class", "type")
                .attr("text-anchor", "middle")
                .attr("baseline-shift", "30%")
                .attr("alignment-baseline", "alphabetic");

            relationshipType
                .attr("transform", rotateIfRightToLeft)
                .attr("x", function(d) { return side( d ) * d.arrow.apex.x; } )
                .attr("y", function(d) { return side( d ) * d.arrow.apex.y; } )
                .attr( "font-size", function ( d ) { return d.model.style( "font-size" ); } )
                .attr( "font-family", function ( d ) { return d.model.style( "font-family" ); } )
                .text( function ( d ) { return d.model.relationshipType(); } );
        }

        function renderProperties( entities, descriminator, view )
        {
            var speechBubbleGroup = view.selectAll( "g.speech-bubble." + descriminator + "-speech-bubble" )
                .data( entities.filter( gd.hasProperties ).map( function(entity) { return entity.properties; } ) );

            speechBubbleGroup.exit().remove();

            speechBubbleGroup.enter().append( "svg:g" )
                .attr( "class", "speech-bubble " + descriminator + "-speech-bubble" );

            speechBubbleGroup
                .attr( "transform", function ( speechBubble )
                {
                    return speechBubble.groupTransform;
                } );

            var speechBubbleOutline = speechBubbleGroup.selectAll( "path.speech-bubble-outline" )
                .data( singleton );

            speechBubbleOutline.exit().remove();

            speechBubbleOutline.enter().append( "svg:path" )
                .attr( "class", "speech-bubble-outline" );

            speechBubbleOutline
                .attr( "transform", function ( speechBubble )
                {
                    return speechBubble.outlineTransform;
                } )
                .attr( "d", function ( speechBubble )
                {
                    return speechBubble.outlinePath;
                } )
                .attr( "fill", function ( speechBubble )
                {
                    return speechBubble.style( "background-color" );
                } )
                .attr( "stroke", function ( speechBubble )
                {
                    return speechBubble.style( "border-color" );
                } )
                .attr( "stroke-width", function ( speechBubble )
                {
                    return speechBubble.style( "border-width" );
                } );

            var propertyKeys = speechBubbleGroup.selectAll( "text.speech-bubble-content.property-key" )
                .data( function ( speechBubble )
                {
                    return speechBubble.properties;
                } );

            propertyKeys.exit().remove();

            propertyKeys.enter().append( "svg:text" )
                .attr( "class", "speech-bubble-content property-key" );

            propertyKeys
                .attr( "x", function ( property )
                {
                    return property.textOrigin.x;
                } )
                .attr( "y", function ( property, i )
                {
                    return (i + 0.5) * parsePixels( property.style( "font-size" ) ) + property.textOrigin.y
                } )
                .attr( "alignment-baseline", "central" )
                .attr( "text-anchor", "end" )
                .attr( "font-size", function ( property ) { return property.style( "font-size" ); } )
                .attr( "font-family", function ( property ) { return property.style( "font-family" ); } )
                .attr( "xml:space", "preserve" )
                .text( function ( property )
                {
                    return property.keyText;
                } );

            var propertyValues = speechBubbleGroup.selectAll( "text.speech-bubble-content.property-value" )
                .data( function ( speechBubble )
                {
                    return speechBubble.properties;
                } );

            propertyValues.exit().remove();

            propertyValues.enter().append( "svg:text" )
                .attr( "class", "speech-bubble-content property-value" );

            propertyValues
                .attr( "x", function ( property )
                {
                    return property.textOrigin.x;
                } )
                .attr( "y", function ( property, i )
                {
                    return (i + 0.5) * parsePixels( property.style( "font-size" ) ) + property.textOrigin.y
                } )
                .attr( "alignment-baseline", "central" )
                .attr( "font-size", function ( property ) { return property.style( "font-size" ); } )
                .attr( "font-family", function ( property ) { return property.style( "font-family" ); } )
                .text( function ( property )
                {
                    return property.valueText;
                } );
        }

        var diagram = function ( selection )
        {
            selection.each( function ( model )
            {
                var view = d3.select( this );

                var layoutModel = gd.layout( model );

                function layer(name)
                {
                    var layer = view.selectAll( "g.layer." + name ).data( [name] );

                    layer.enter().append("g")
                        .attr("class", "layer " + name);

                    return layer;
                }

                renderRelationships( layoutModel.relationshipGroups, layer("relationships") );
                renderNodes( layoutModel.nodes, layer("nodes") );

                renderProperties( layoutModel.nodes, "node", layer("properties") );
                renderProperties( layoutModel.relationships, "relationship", layer("properties") );

                overlay( layoutModel, layer("overlay") );

                scaling( layoutModel, view );
            } );
        };

        diagram.overlay = function(behaviour) {
            overlay = behaviour;
            return diagram;
        };

        diagram.scaling = function(scalingFunction) {
            scaling = scalingFunction;
            return this;
        };

        return diagram;
    };
})();