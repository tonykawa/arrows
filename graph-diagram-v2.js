
(function() {
    
    gd.layout = function(graphModel)
    {
        var layoutModel = {
            graphModel: graphModel,
            nodes: [],
            relationships: [],
            relationshipGroups: []
        };

        var nodesById = {};

        graphModel.nodeList().forEach( function ( node )
        {
            var measurement = gd.wrapAndMeasureCaption( node );

            var layoutNode = {
                class: node.class,
                x: node.ex(),
                y: node.ey(),
                radius: measurement.radius,
                captionLines: measurement.captionLines,
                captionLineHeight: measurement.captionLineHeight,
                properties: gd.nodeSpeechBubble( graphModel )( node, measurement.radius ),
                model: node
            };
            nodesById[node.id] = layoutNode;
            layoutModel.nodes.push(layoutNode);
        } );

        function horizontalArrow(relationship, start, end, offset) {
            var length = start.model.distanceTo(end.model);
            var arrowWidth = parsePixels( relationship.style( "width" ) );
            if (offset === 0)
            {
                return gd.horizontalArrowOutline(
                    start.radius.startRelationship(),
                    (length - end.radius.endRelationship()),
                    arrowWidth );
            }
            return gd.curvedArrowOutline(
                start.radius.startRelationship(),
                end.radius.endRelationship(),
                length,
                offset,
                arrowWidth,
                arrowWidth * 4,
                arrowWidth * 4
            );
        }

        graphModel.groupedRelationshipList().forEach( function( group ) {
            var nominatedStart = group[0].start;
            var offsetStep = parsePixels( group[0].style( "margin" ) );
            var relationshipGroup = [];
            for ( var i = 0; i < group.length; i++ )
            {
                var relationship = group[i];
                var offset = (relationship.start === nominatedStart ? 1 : -1) *
                    offsetStep * (i - (group.length - 1) / 2);

                var start = nodesById[relationship.start.id];
                var end = nodesById[relationship.end.id];
                var arrow = horizontalArrow( relationship, start, end, offset );

                var layoutRelationship = {
                    start: start,
                    end: end,
                    arrow: arrow,
                    properties: gd.relationshipSpeechBubble()( relationship, arrow.apex ),
                    model: relationship
                };
                relationshipGroup.push( layoutRelationship );
                layoutModel.relationships.push(layoutRelationship);
            }
            layoutModel.relationshipGroups.push(relationshipGroup);
        } );

        return layoutModel;
    };

    gd.scaling = function() {

        var scaling = {};

        scaling.nodeBox = function( node )
        {
            var margin = node.radius.outside();
            return {
                x1: node.model.ex() - margin,
                y1: node.model.ey() - margin,
                x2: node.model.ex() + margin,
                y2: node.model.ey() + margin
            };
        };

        scaling.boxNormalise = function( box )
        {
            return {
                x1: box.width > 0 ? box.x : box.x + box.width,
                y1: box.height > 0 ? box.y : box.y +box. height,
                x2: box.width < 0 ? box.x : box.x + box.width,
                y2: box.height < 0 ? box.y : box.y + box.height
            };
        };

        scaling.boxUnion = function ( boxes )
        {
            if ( boxes.length < 1 )
            {
                return { x1:0, y1:0, x2:0, y2:0 };
            }
            return boxes.reduce( function ( previous, current )
            {
                return {
                    x1:Math.min( previous.x1, current.x1 ),
                    y1:Math.min( previous.y1, current.y1 ),
                    x2:Math.max( previous.x2, current.x2 ),
                    y2:Math.max( previous.y2, current.y2 )
                };
            } );
        };

        function smallestContainingBox(layoutModel) {
            function boundingBox( entity )
            {
                return entity.properties.boundingBox;
            }

            var bounds = scaling.boxUnion( layoutModel.nodes.map( scaling.nodeBox )
                .concat( layoutModel.nodes.filter(gd.hasProperties ).map( boundingBox )
                    .map( scaling.boxNormalise ) )
                .concat( layoutModel.relationships.filter(gd.hasProperties ).map( boundingBox )
                    .map( scaling.boxNormalise ) ) );

            return { x: bounds.x1, y: bounds.y1,
                width: (bounds.x2 - bounds.x1), height: (bounds.y2 - bounds.y1) }
        }

        scaling.centeredOrScaledViewBox = function(viewDimensions, diagramExtent) {
            var xScale = diagramExtent.width / viewDimensions.width;
            var yScale = diagramExtent.height / viewDimensions.height;
            var scaleFactor = xScale < 1 && yScale < 1 ? 1 : (xScale > yScale ? xScale : yScale);

            return {
                x: ((diagramExtent.width - viewDimensions.width * scaleFactor) / 2) + diagramExtent.x,
                y: ((diagramExtent.height - viewDimensions.height * scaleFactor) / 2) + diagramExtent.y,
                width: viewDimensions.width * scaleFactor,
                height: viewDimensions.height * scaleFactor
            };
        };

        function effectiveBox( viewBox, viewSize )
        {
            if ( viewBox.width / viewSize.width > viewBox.height / viewSize.height )
            {
                return {
                    x: viewBox.x,
                    y: viewBox.y - ((viewBox.width * viewSize.height / viewSize.width) - viewBox.height) / 2,
                    width: viewBox.width,
                    height: viewBox.width * viewSize.height / viewSize.width
                }
            }
            else
            {
                return {
                    x: viewBox.x - ((viewBox.height * viewSize.width / viewSize.height) - viewBox.width) / 2,
                    y: viewBox.y,
                    width: viewBox.height * viewSize.width / viewSize.height,
                    height: viewBox.height
                }
            }
        }

        function viewDimensions(view)
        {
            var svgElement = view.node();
            return {
                width: svgElement.clientWidth,
                height: svgElement.clientHeight
            };
        }

        scaling.centerOrScaleDiagramToFitSvg = function(layoutModel, view) {
            var box = scaling.centeredOrScaledViewBox( viewDimensions(view), smallestContainingBox( layoutModel ) );

            view
                .attr("viewBox", [box.x, box.y, box.width, box.height].join( " " ));
        };

        scaling.centerOrScaleDiagramToFitWindow = function(layoutModel, view) {
            var windowDimensions = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            var box = scaling.centeredOrScaledViewBox( windowDimensions, smallestContainingBox( layoutModel ) );

            view
                .attr("width", windowDimensions.width)
                .attr("height", windowDimensions.height)
                .attr("viewBox", [box.x, box.y, box.width, box.height].join( " " ));
        };

        scaling.centerOrScaleDiagramToFitSvgSmooth = function(layoutModel, view) {
            var box = scaling.centeredOrScaledViewBox( viewDimensions(view), smallestContainingBox( layoutModel ) );

            view
                .transition()
                .attr("viewBox", [box.x, box.y, box.width, box.height].join( " " ));
        };

        function fitsInside( extent, box )
        {
            return extent.x >= box.x &&
                extent.y >= box.y &&
                extent.x + extent.width <= box.x + box.width &&
                extent.y + extent.height <= box.y + box.height;
        }

        scaling.growButDoNotShrink = function(layoutModel, view) {
            var currentViewBoxAttr = view.attr("viewBox");
            if ( currentViewBoxAttr === null )
            {
                scaling.centeredOrScaledViewBox(layoutModel, view);
            } else {
                var currentDimensions = currentViewBoxAttr.split(" " ).map(parseFloat);
                var currentBox = {
                    x: currentDimensions[0],
                    y: currentDimensions[1],
                    width: currentDimensions[2],
                    height: currentDimensions[3]
                };
                var diagramExtent = smallestContainingBox( layoutModel );

                var box;
                if ( fitsInside(diagramExtent, effectiveBox( currentBox, viewDimensions( view ) ))) {
                    box = currentBox;
                }
                else
                {
                    var idealBox = scaling.centeredOrScaledViewBox( viewDimensions(view), diagramExtent );
                    box = {
                        x: Math.min(currentBox.x, idealBox.x),
                        y: Math.min(currentBox.y, idealBox.y),
                        width: Math.max(currentBox.x + currentBox.width, idealBox.x + idealBox.width) -
                            Math.min(currentBox.x, idealBox.x),
                        height: Math.max(currentBox.y + currentBox.height, idealBox.y + idealBox.height) -
                            Math.min(currentBox.y, idealBox.y)
                    };
                }

                view
                    .attr("viewBox", [box.x, box.y, box.width, box.height].join( " " ));
            }
        };

        scaling.sizeSvgToFitDiagram = function(layoutModel, view) {
            var box = smallestContainingBox( layoutModel );

            view
                .attr("viewBox", [box.x, box.y, box.width, box.height].join( " " ))
                .attr("width", box.width * layoutModel.graphModel.externalScale())
                .attr("height", box.height * layoutModel.graphModel.externalScale());
        };

        return scaling;
    }();

    gd.horizontalArrowOutline = function(start, end, arrowWidth) {
        var shaftRadius = arrowWidth / 2;
        var headRadius = arrowWidth * 2;
        var headLength = headRadius * 2;
        var shoulder = start < end ? end - headLength : end + headLength;
        return {
            outline: [
                "M", start, shaftRadius,
                "L", shoulder, shaftRadius,
                "L", shoulder, headRadius,
                "L", end, 0,
                "L", shoulder, -headRadius,
                "L", shoulder, -shaftRadius,
                "L", start, -shaftRadius,
                "Z"
            ].join(" "),
            apex: {
                x: start + (shoulder - start) / 2,
                y: 0
            }
        };
    };

    gd.curvedArrowOutline = function(startRadius, endRadius, endCentre, minOffset, arrowWidth, headWidth, headLength)
    {
        var startAttach, endAttach, offsetAngle;

        function square( l )
        {
            return l * l;
        }

        var radiusRatio = startRadius / (endRadius + headLength);
        var homotheticCenter = -endCentre * radiusRatio / (1 - radiusRatio);

        function intersectWithOtherCircle(fixedPoint, radius, xCenter, polarity)
        {
            var gradient = fixedPoint.y / (fixedPoint.x - homotheticCenter);
            var hc = fixedPoint.y - gradient * fixedPoint.x;

            var A = 1 + square(gradient);
            var B = 2 * (gradient * hc - xCenter);
            var C = square(hc) + square(xCenter) - square(radius);

            var intersection = { x: (-B + polarity * Math.sqrt( square( B ) - 4 * A * C )) / (2 * A) };
            intersection.y = (intersection.x - homotheticCenter) * gradient;

            return intersection;
        }

        if(endRadius + headLength > startRadius)
        {
            offsetAngle = minOffset / startRadius;
            startAttach = {
                x: Math.cos( offsetAngle ) * (startRadius),
                y: Math.sin( offsetAngle ) * (startRadius)
            };
            endAttach = intersectWithOtherCircle( startAttach, endRadius + headLength, endCentre, -1 );
        }
        else
        {
            offsetAngle = minOffset / endRadius;
            endAttach = {
                x: endCentre - Math.cos( offsetAngle ) * (endRadius + headLength),
                y: Math.sin( offsetAngle ) * (endRadius + headLength)
            };
            startAttach = intersectWithOtherCircle( endAttach, startRadius, 0, 1 );
        }

        var
            g1 = -startAttach.x / startAttach.y,
            c1 = startAttach.y + (square( startAttach.x ) / startAttach.y),
            g2 = -(endAttach.x - endCentre) / endAttach.y,
            c2 = endAttach.y + (endAttach.x - endCentre) * endAttach.x / endAttach.y;

        var cx = ( c1 - c2 ) / (g2 - g1);
        var cy = g1 * cx + c1;

        var arcRadius = Math.sqrt(square(cx - startAttach.x) + square(cy - startAttach.y));

        function startTangent(dr)
        {
            var dx = (dr < 0 ? -1 : 1) * Math.sqrt(square(dr) / (1 + square(g1)));
            var dy = g1 * dx;
            return [
                startAttach.x + dx,
                startAttach.y + dy
            ].join(",");
        }

        function endTangent(dr)
        {
            var dx = (dr < 0 ? -1 : 1) * Math.sqrt(square(dr) / (1 + square(g2)));
            var dy = g2 * dx;
            return [
                endAttach.x + dx,
                endAttach.y + dy
            ].join(",");
        }

        function endNormal(dc)
        {
            var dx = (dc < 0 ? -1 : 1) * Math.sqrt(square(dc) / (1 + square(1 / g2)));
            var dy = dx / g2;
            return [
                endAttach.x + dx,
                endAttach.y - dy
            ].join(",");
        }

        var shaftRadius = arrowWidth / 2;
        var headRadius = headWidth / 2;

        return {
            outline: [
                "M", startTangent(-shaftRadius),
                "L", startTangent(shaftRadius),
                "A", arcRadius - shaftRadius, arcRadius - shaftRadius, 0, 0, minOffset > 0 ? 0 : 1, endTangent(-shaftRadius),
                "L", endTangent(-headRadius),
                "L", endNormal(headLength),
                "L", endTangent(headRadius),
                "L", endTangent(shaftRadius),
                "A", arcRadius + shaftRadius, arcRadius + shaftRadius, 0, 0, minOffset < 0 ? 0 : 1, startTangent(-shaftRadius)
            ].join( " " ),
            apex: {
                x: cx,
                y: cy > 0 ? cy - arcRadius : cy + arcRadius
            }
        };
    };

    gd.chooseNodeSpeechBubbleOrientation = function(focusNode, relatedNodes) {
        var orientations = [
            { key: "WEST"       , style: "horizontal", mirrorX: -1, mirrorY:  1, angle:  180 },
            { key: "NORTH-WEST" , style: "diagonal",   mirrorX: -1, mirrorY: -1, angle: -135 },
            { key: "NORTH"      , style: "vertical",   mirrorX:  1, mirrorY: -1, angle:  -90 },
            { key: "NORTH-EAST" , style: "diagonal",   mirrorX:  1, mirrorY: -1, angle:  -45 },
            { key: "EAST"       , style: "horizontal", mirrorX:  1, mirrorY:  1, angle:    0 },
            { key: "SOUTH-EAST" , style: "diagonal",   mirrorX:  1, mirrorY:  1, angle:   45 },
            { key: "SOUTH"      , style: "vertical",   mirrorX:  1, mirrorY:  1, angle:   90 },
            { key: "SOUTH-WEST" , style: "diagonal",   mirrorX: -1, mirrorY:  1, angle:  135 }
        ];

        orientations.forEach(function(orientation) {
            orientation.closest = 180;
        });

        relatedNodes.forEach(function(relatedNode) {
            orientations.forEach(function(orientation) {
                var angle = Math.abs(focusNode.angleTo( relatedNode ) - orientation.angle);
                if ( angle > 180 )
                {
                    angle = 360 - angle;
                }
                if (angle < orientation.closest) {
                    orientation.closest = angle;
                }
            });
        });

        var maxAngle = 0;
        var bestOrientation = orientations[0];
        orientations.forEach(function(orientation) {
            if (orientation.closest > maxAngle) {
                maxAngle = orientation.closest;
                bestOrientation = orientation;
            }
        });

        return bestOrientation;
    };

    gd.chooseRelationshipSpeechBubbleOrientation = function(relationship) {
        var orientations = {
            EAST:       { style: "horizontal", mirrorX:  1, mirrorY:  1, angle:    0 },
            SOUTH_EAST: { style: "diagonal",   mirrorX:  1, mirrorY:  1, angle:   45 },
            SOUTH     : { style: "vertical",   mirrorX:  1, mirrorY:  1, angle:   90 },
            SOUTH_WEST: { style: "diagonal",   mirrorX: -1, mirrorY:  1, angle:  135 },
            WEST:       { style: "horizontal", mirrorX: -1, mirrorY:  1, angle:  180 }
        };

        var relationshipAngle = relationship.start.angleTo(relationship.end);

        var positiveAngle = relationshipAngle > 0 ? relationshipAngle : relationshipAngle + 180;

        if ( positiveAngle > 175 || positiveAngle < 5 )
        {
            return orientations.SOUTH;
        }
        else if ( positiveAngle < 85 )
        {
            return orientations.SOUTH_WEST
        }
        else if ( positiveAngle < 90 )
        {
            return orientations.WEST;
        }
        else if ( positiveAngle === 90 )
        {
            return relationshipAngle > 0 ? orientations.WEST : orientations.EAST;
        }
        else if ( positiveAngle < 95 )
        {
            return orientations.EAST;
        }
        else
        {
            return orientations.SOUTH_EAST;
        }
    };

    gd.speechBubblePath = function(textSize, style, margin, padding) {
        var width = textSize.width, height = textSize.height;
        var styles = {
            diagonal: [
                "M", 0, 0,
                "L", margin + padding, margin,
                "L", margin + width + padding, margin,
                "A", padding, padding, 0, 0, 1, margin + width + padding * 2, margin + padding,
                "L", margin + width + padding * 2, margin + height + padding,
                "A", padding, padding, 0, 0, 1, margin + width + padding, margin + height + padding * 2,
                "L", margin + padding, margin + height + padding * 2,
                "A", padding, padding, 0, 0, 1, margin, margin + height + padding,
                "L", margin, margin + padding,
                "Z"
            ],
            horizontal: [
                "M", 0, 0,
                "L", margin, -padding,
                "L", margin, -height / 2,
                "A", padding, padding, 0, 0, 1, margin + padding, -height / 2 - padding,
                "L", margin + width + padding, -height / 2 - padding,
                "A", padding, padding, 0, 0, 1, margin + width + padding * 2, -height / 2,
                "L", margin + width + padding * 2, height / 2,
                "A", padding, padding, 0, 0, 1, margin + width + padding, height / 2 + padding,
                "L", margin + padding, height / 2 + padding,
                "A", padding, padding, 0, 0, 1, margin, height / 2,
                "L", margin, padding,
                "Z"
            ],
            vertical: [
                "M", 0, 0,
                "L", -padding, margin,
                "L", -width / 2, margin,
                "A", padding, padding, 0, 0, 0, -width / 2 - padding, margin + padding,
                "L", -width / 2 - padding, margin + height + padding,
                "A", padding, padding, 0, 0, 0, -width / 2, margin + height + padding * 2,
                "L", width / 2, margin + height + padding * 2,
                "A", padding, padding, 0, 0, 0, width / 2 + padding, margin + height + padding,
                "L", width / 2 + padding, margin + padding,
                "A", padding, padding, 0, 0, 0, width / 2, margin,
                "L", padding, margin,
                "Z"
            ]
        };
        return styles[style].join(" ");
    };

    function parsePixels(fontSize)
    {
        return parseFloat( fontSize.slice( 0, -2 ) );
    }

    gd.Radius = function(insideRadius) {

        this.insideRadius = insideRadius;
        this.borderWidth = gd.parameters.nodeStrokeWidth;
        this.arrowMargin = gd.parameters.nodeStartMargin;

        this.inside = function(insideRadius) {
            if (arguments.length == 1)
            {
                this.insideRadius = insideRadius;
                return this;
            }
            return this.insideRadius;
        };

        this.border = function(borderWidth) {
            if (arguments.length == 1)
            {
                this.borderWidth = borderWidth;
                return this;
            }
            return this.borderWidth;
        };

        this.margin = function(arrowMargin) {
            if (arguments.length == 1)
            {
                this.arrowMargin = arrowMargin;
                return this;
            }
            return this.arrowMargin;
        };

        this.mid = function() {
            return this.insideRadius + this.borderWidth / 2;
        };

        this.outside = function() {
            return this.insideRadius + this.borderWidth;
        };

        this.startRelationship = function() {
            return this.insideRadius + this.borderWidth + this.arrowMargin;
        };

        this.endRelationship = function() {
            return this.insideRadius + this.borderWidth + this.arrowMargin;
        };
    };

    gd.wrapAndMeasureCaption = function()
    {
        return function ( node )
        {
            function measure( text )
            {
                return gd.textDimensions.measure( text, node );
            }

            var lineHeight = parsePixels( node.style( "font-size" ) );
            var insideRadius = 0;
            var captionLines = [];

            if ( node.caption() ) {
                var padding = parsePixels( node.style( "padding" ) );
                var totalWidth = measure( node.caption() );
                var idealRadius = Math.sqrt( totalWidth * lineHeight / Math.PI );
                var idealRows = idealRadius * 2 / lineHeight;
                function idealLength( row )
                {
                    var rowOffset = lineHeight * (row - idealRows) / 2;
                    return Math.sqrt( idealRadius * idealRadius - rowOffset * rowOffset) * 2;
                }
                var words = node.caption().split(" ");
                var currentLine = words.shift();
                while (words.length > 0)
                {
                    if ( measure(currentLine) > idealLength(captionLines.length) )
                    {
                        captionLines.push(currentLine);
                        currentLine = words.shift();
                    } else {
                        currentLine += " " + words.shift();
                    }
                }
                captionLines.push(currentLine);

                for ( var row = 0; row < captionLines.length; row++ )
                {
                    var width = measure( captionLines[row] ) / 2;
                    var middleRow = (captionLines.length - 1) / 2;
                    var rowOffset = lineHeight * (row > middleRow ? (row - middleRow + 0.5) : (row - middleRow - 0.5));
                    insideRadius = padding + Math.max( Math.sqrt(width * width + rowOffset * rowOffset), insideRadius);
                }
            }
            var minRadius = parsePixels( node.style("min-width")) / 2;
            if ( minRadius > insideRadius )
            {
                insideRadius = minRadius;
            }
            var radius = new gd.Radius( insideRadius );
            radius.border( parsePixels( node.style( "border-width" ) ) );
            radius.margin( parsePixels( node.style( "margin" ) ) );

            return {
                radius: radius,
                captionLines: captionLines,
                captionLineHeight: lineHeight
            };
        }
    }();

    gd.nodeSpeechBubble = function ( model )
    {
        return function ( node, radius )
        {
            var relatedNodes = [];
            model.relationshipList().forEach( function ( relationship )
            {
                if ( relationship.start === node )
                {
                    relatedNodes.push( relationship.end );
                }
                if ( relationship.end === node )
                {
                    relatedNodes.push( relationship.start );
                }
            } );
            var orientation = gd.chooseNodeSpeechBubbleOrientation( node, relatedNodes );

            var properties = node.properties();

            var propertyKeysWidth = d3.max( properties.list(), function ( property )
            {
                return gd.textDimensions.measure( property.key + ": ", properties );
            } );
            var propertyValuesWidth = d3.max( properties.list(), function ( property )
            {
                return gd.textDimensions.measure( property.value, properties );
            } );
            var textSize = {
                width:propertyKeysWidth + propertyValuesWidth,
                height:properties.list().length * parsePixels( properties.style( "font-size" ) )
            };

            var mirror = "scale(" + orientation.mirrorX + "," + orientation.mirrorY + ") ";

            var margin = parsePixels( properties.style( "margin" ) );
            var padding = parsePixels( properties.style( "padding" ) );

            var diagonalRadius = radius.mid() * Math.sqrt( 2 ) / 2;
            var nodeOffsetOptions = {
                diagonal:{ attach:{ x:diagonalRadius, y:diagonalRadius },
                    textCorner:{
                        x:margin + padding,
                        y:margin + padding
                    } },
                horizontal:{ attach:{ x:radius.mid(), y:0 },
                    textCorner:{
                        x:margin + padding,
                        y:-textSize.height / 2
                    } },
                vertical:{ attach:{ x:0, y:radius.mid() },
                    textCorner:{
                        x:-textSize.width / 2,
                        y:margin + padding
                    } }
            };
            var nodeCenterOffset = nodeOffsetOptions[orientation.style].attach;
            var textCorner = nodeOffsetOptions[orientation.style].textCorner;

            var translate = "translate(" + (node.ex() + nodeCenterOffset.x * orientation.mirrorX) + ","
                + (node.ey() + nodeCenterOffset.y * orientation.mirrorY) + ") ";

            var textOrigin = {
                x:propertyKeysWidth + orientation.mirrorX * (textCorner.x)
                    - (orientation.mirrorX == -1 ? textSize.width : 0),
                y:orientation.mirrorY * (textCorner.y)
                    - (orientation.mirrorY == -1 ? textSize.height : 0)
            };

            var boundingPadding = padding + gd.parameters.speechBubbleStrokeWidth / 2;

            var boundingBox = {
                x:node.ex() + (nodeCenterOffset.x + textCorner.x - boundingPadding) * orientation.mirrorX,
                y:node.ey() + (nodeCenterOffset.y + textCorner.y - boundingPadding) * orientation.mirrorY,
                width:orientation.mirrorX * (textSize.width + (boundingPadding * 2)),
                height:orientation.mirrorY * (textSize.height + (boundingPadding * 2))
            };

            return {
                properties:properties.list().map( function ( property )
                {
                    return {
                        keyText:property.key + ": ",
                        valueText:property.value,
                        textOrigin:textOrigin,
                        style:node.properties().style
                    }
                } ),
                style:node.properties().style,
                groupTransform:translate,
                outlineTransform:mirror,
                outlinePath:gd.speechBubblePath( textSize, orientation.style, margin, padding ),
                boundingBox:boundingBox
            };
        }
    };

    gd.relationshipSpeechBubble = function ()
    {
        return function ( relationship, apex )
        {
            var properties = relationship.properties();

            var orientation = gd.chooseRelationshipSpeechBubbleOrientation( relationship );

            var propertyKeysWidth = d3.max( properties.list(), function ( property )
            {
                return gd.textDimensions.measure( property.key + ": ", properties );
            } );
            var propertyValuesWidth = d3.max( properties.list(), function ( property )
            {
                return gd.textDimensions.measure( property.value, properties );
            } );
            var textSize = {
                width:propertyKeysWidth + propertyValuesWidth,
                height:properties.list().length * parsePixels( properties.style( "font-size" ) )
            };

            var margin = parsePixels( properties.style( "margin" ) );
            var padding = parsePixels( properties.style( "padding" ) );

            var mirror = "scale(" + orientation.mirrorX + "," + orientation.mirrorY + ") ";

            var nodeOffsetOptions = {
                diagonal:{
                    textCorner:{
                        x:margin + padding,
                        y:margin + padding
                    } },
                horizontal:{
                    textCorner:{
                        x:margin + padding,
                        y:-textSize.height / 2
                    } },
                vertical:{
                    textCorner:{
                        x:-textSize.width / 2,
                        y:margin + padding
                    } }
            };
            var textCorner = nodeOffsetOptions[orientation.style].textCorner;

            var dx = relationship.end.ex() - relationship.start.ex();
            var dy = relationship.end.ey() - relationship.start.ey();
            var h = Math.sqrt(dx * dx + dy * dy);

            var midPoint = {
                x: relationship.start.ex() + (apex.x * dx - apex.y * dy) / h,
                y: relationship.start.ey() +(apex.x * dy + apex.y * dx) / h
            };

            var translate = "translate(" + midPoint.x + "," + midPoint.y + ") ";

            var textOrigin = {
                x:propertyKeysWidth + orientation.mirrorX * (textCorner.x)
                    - (orientation.mirrorX == -1 ? textSize.width : 0),
                y:orientation.mirrorY * (textCorner.y)
                    - (orientation.mirrorY == -1 ? textSize.height : 0)
            };

            var boundingPadding = padding + gd.parameters.speechBubbleStrokeWidth / 2;

            var boundingBox = {
                x:midPoint.x + (textCorner.x - boundingPadding) * orientation.mirrorX,
                y:midPoint.y + (textCorner.y - boundingPadding) * orientation.mirrorY,
                width:orientation.mirrorX * (textSize.width + (boundingPadding * 2)),
                height:orientation.mirrorY * (textSize.height + (boundingPadding * 2))
            };

            return {
                properties:properties.list().map( function ( property )
                {
                    return {
                        keyText:property.key + ": ",
                        valueText:property.value,
                        textOrigin:textOrigin,
                        style:relationship.properties().style
                    }
                } ),
                style:relationship.properties().style,
                groupTransform:translate,
                outlineTransform:mirror,
                outlinePath:gd.speechBubblePath( textSize, orientation.style, margin, padding ),
                boundingBox:boundingBox
            };
        }
    };

    gd.textDimensions = function() {
        var textDimensions = {};

        textDimensions.measure = function ( text, styleSource ) {
            var fontSize = styleSource.style( "font-size" );
            var fontFamily = styleSource.style( "font-family" );
            var canvasSelection = d3.select("#textMeasuringCanvas").data([this]);
            canvasSelection.enter().append("canvas")
                .attr("id", "textMeasuringCanvas");

            var canvas = canvasSelection.node();
            var context = canvas.getContext("2d");
            context.font = "normal normal normal " + fontSize + "/normal " + fontFamily;
            return context.measureText(text).width;
        };
        
        return textDimensions;
    }();

    gd.hasProperties = function ( entity )
    {
        return entity.model.properties().list().length > 0;
    };

    gd.figure = function ()
    {
        var diagram = gd.diagram();

        var figure = function ( selection )
        {
            selection.each( function ()
            {
                var figure = d3.select( this );
                var markup = figure.select( "ul.graph-diagram-markup" );
                var model = gd.markup.parse( markup );
                figure.selectAll( "svg" )
                    .data( [model] )
                    .enter()
                    .append( "svg" )
                    .call( diagram );
            } );
        };

        figure.scaling = function(scalingFunction)
        {
            diagram.scaling(scalingFunction);
            return figure;
        };

        return figure;
    };
})();
