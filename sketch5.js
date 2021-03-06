var broadcast;
var cell=[];
var editMode=2;
var changeButton, saveButton;
var maxWid=50, maxHei=50;
var screenControl;
function setup()
{
	createCanvas(windowWidth,windowHeight);
	broadcast=new BROADCAST();
	screenControl=new SCREEN_CONTROL(45*(1.5*maxWid-0.5),45*cos(PI/6)*(2*maxHei+1));
	changeButton=createButton("mode Change");
	saveButton=createButton("save");
	changeButton.position(0,0);
	saveButton.position(width-saveButton.width,0);
	changeButton.mousePressed(modeChange);
	saveButton.mousePressed(exportMap);
	for(var i=0;i<maxHei;i++)
	{
		cell[i]=[];
		for(var j=0;j<maxWid;j++)
		{
			cell[i][j]=new CELL(i,j,0,0);
		}
	}
}
function draw()
{
	var i,j;
	background(255);
	screenControl.setScreen();
	broadcast.renew();
	console.log('a',pmouseX,pmouseY);
	if(broadcast.isMousePress)
	{
		for(i=0;i<maxHei;i++)
		{
			for(j=0;j<maxWid;j++)
			{
				if(cell[i][j].isMouseOn())
				{
					if(editMode==1)
					{
						cell[i][j].kind=(cell[i][j].kind+1)%6;
					}
					else
					{
						cell[i][j].who=(cell[i][j].who+1)%3;
					}
				}
			}
		}
	}
	for(i=0;i<maxHei;i++)
	{
		for(j=0;j<maxWid;j++)
		{
			cell[i][j].draw();
		}
	}
}
function mousePressed()
{
	broadcast.isMousePress=true;
	broadcast.dmouseX=mouseX;
	broadcast.dmouseY=mouseY;
}
function mouseDragged()
{
	console.log("c",broadcast.dmouseX,broadcast.dmouseY);
	var deltaX=mouseX-broadcast.dmouseX;
	var deltaY=mouseY-broadcast.dmouseY;
	screenControl.move(deltaX,deltaY);
}
function mouseWheel(event)
{
	var newZoom=screenControl.zoom+0.001*event.delta;
	screenControl.scale(newZoom,mouseX,mouseY);
}
function modeChange()
{
	editMode=editMode%2+1;
}
function exportMap()
{
}

/**
 *
 * 육각형 셀 클래스
 * 
 * @author steliviere
 * @date 2017.12.13
 * @version 0.3
 *
 */
function CELL(i,j,kind,who)
{
	/**
	 *
	 * @var {object} index	각 셀의 인덱스 no.
	 			i:열(row) 인덱스
				j:행(column) 인덱스
 	 * @var {float} x	셀 중심의 x좌표
	 * @var {float} y	셀 중심의 y좌표
	 * @var {float} r	셀의 반지름
	 * @var {int} kind	셀의 타입
				0:빈 공간
				1:이동 가능 셀
				2:이동 불가 셀
				3:베이스
				4:서브베이스
				5:벽
	 * @var {int} who	셀의 진영
				1:플레이어/1P
				2:상대/2P
				0:중립
				-1:칠할 수 없음
	 *
	 */
	this.index={i:i,j:j};
	this.x=45*(1.5*this.index.j+1);
	this.y=45*cos(PI/6)*(2*this.index.i+2-this.index.j%2);
	this.kind=kind;
	this.who=who;
	this.r=30;
	if(this.kind==3) this.r=40;
}
/**
 *
 * 각 셀들을 스크린에 그리는 함수
 *
 */
CELL.prototype.draw=function()
{
	switch(this.who)
	{
		case 1:fill("#0000ff"); break;
		case 2:fill("#ff0000"); break;
		default:fill(220);
	}
	var pos=createVector(this.x,this.y);
	var edge=createVector(this.r,0);
	var p=createVector();
	beginShape();
	for(var i=0;i<6;i++)
	{
		p=p5.Vector.add(edge,pos);
		vertex(p.x,p.y);
		edge.rotate(PI/3);
	}
	endShape(CLOSE);
	fill(0);
	text(this.kind,this.x,this.y);
}
/**
 *
 * 셀 위에 마우스가 올려져 있는지 체크하는 함수
 *
 * @return {boolean}	셀 위에 마우스가 올려져 있는지 여부
 *
 */
CELL.prototype.isMouseOn=function()
{
	var mouse=screenControl.relativeMouse();
	var mousePos=createVector(this.x,this.y);
	mousePos.sub(mouse);
	var edge=createVector(this.r,0);
	var theta=0;
	for(var i=0;i<6;i++)
	{
		var v1=p5.Vector.sub(edge,mousePos);
		edge.rotate(PI/3);
		var v2=p5.Vector.sub(edge,mousePos);
		theta+=v1.angleBetween(v2);
	}
	return abs(theta-TWO_PI)<0.00001;
}
/**
 *
 * 셀을 클릭했을 때 메인 함수에 자신의 인덱스 no와 셀의 유형을 보낸다.
 *
 * @return {object}	메인 함수에 전달할 값들
 			index:자신의 인덱스 no.
			signal:버튼 종류(0:움직일 수 없는 셀, 1:움직일 수 있는 셀, 2:필러)
 *
 */
CELL.prototype.mouseClick=function
{
	var code;
	switch(this.kind)
	{
		case 3:
		case 4:code=2; break;
		case 1:code=1; break;
		default:code=0;
	}
	return {index:this.index, signal:code};
}


/**
 *
 * p5.js에서 동작하는 마우스, 키보드 제어 변수의 집합.
 * 별도의 함수로 동작하는 트리거를 함수 외부에서도 동작하게 하기 위함.
 *
 * @author steliviere
 * @date 2017.12.13
 * @version 1.1
 *
 */
function BROADCAST()
{
	/**
	 *
	 * @var {boolean} isMousePress	마우스 클릭 여부(클릭했을 시점에만 true, 나머지는 false)
	 * @var {float} dmouseX		드래그 시 이전 마우스 X좌표
	 * @var {float} dmouseY		드래그 시 이전 마우스 Y좌표
	 *
	 */
	this.isMousePress=false;
	this.wasMousePress=false;
	this.dmouseX=mouseX;
	this.dmouseY=mouseY;
}
/**
 *
 * 변수를 갱신하는 함수
 *
 */
BROADCAST.prototype.renew=function()
{
	if(this.wasMousePress)
	{
		this.isMousePress=false;
		this.wasMousePress=false;
	}
	else if(this.isMousePress) this.wasMousePress=true;
	if(mouseIsPressed)
	{
		this.dmouseX=mouseX;
		this.dmouseY=mouseY;
	}
	console.log('b',this.dmouseX,this.dmouseY);
}


/**
 *
 * p5.js에서 동작하는 스크린 컨트롤 클래스.
 * 마우스의 위치에 따라 현재 스크린을 이동시키거나 크기를 늘리고 줄일 수 있다.
 * 
 * @author steliviere
 * @date 2017.12.07
 * @version 1.0
 *
 */
function SCREEN_CONTROL(w,h)
{
	/**
	 *
	 * @var {float} w	조작할 이미지의 너비
	 * @var {float} h	조작할 이미지의 높이
	 * @var {float} ox	원점의 x좌표
	 * @var {float} oy	원점의 y좌표
	 * @var {float} zoom	확대 배율
	 *
	 */
	this.w=w;
	this.h=h;
	this.ox=(width-w)/2;
	this.oy=(height-h)/2;
	this.zoom=1;
}
/**
 *
 * 마우스 드래그에 따라 스크린을 움직이는 함수
 * 
 * @param {float} dx		이동 거리의 x축 변화량
 * @param {float} dy		이동 거리의 y축 변화량
 *
 */
SCREEN_CONTROL.prototype.move=function(dx,dy)
{
	this.ox+=dx;
	this.oy+=dy;
	this.limit();
}
/**
 *
 * 마우스의 현재 위치에 따라 확대, 축소하는 함수
 * 
 * @param {float} newZoom	스케일링할 배율
 * @param {float} pinX		기준 좌표의 X좌표(절대적)
 * @param {float} pinY		기준 좌표의 Y좌표(절대적)
 *
 */
SCREEN_CONTROL.prototype.scale=function(newZoom,pinX,pinY)
{
	var ratio=newZoom/this.zoom;
	if(newZoom>4) ratio=4/this.zoom;
	this.zoom=newZoom;
	this.ox=pinX-(pinX-this.ox)*ratio;
	this.oy=pinY-(pinY-this.oy)*ratio;
	this.limit();
}
/**
 *
 * @원점과 배율을 제한하는 함수
 * @배율은 최소 스크린 크기부터 최대 4배까지 조절됨
 *
 */
SCREEN_CONTROL.prototype.limit=function()
{
	var zoomMin=min(width/this.w,height/this.h,1);
	this.zoom=constrain(this.zoom,zoomMin,4);
	var wLimit=width-this.w*this.zoom;
	var hLimit=height-this.h*this.zoom;
	if(wLimit<0) this.ox=constrain(this.ox,wLimit,0);
	else this.ox=wLimit/2;
	if(hLimit<0) this.oy=constrain(this.oy,hLimit,0);
	else this.oy=hLimit/2;
	console.log(this.ox,this.oy);
}
/**
 *
 * 객체의 현재 속성에 따라 실제로 스크린을 이동시키는 함수
 *
 */
SCREEN_CONTROL.prototype.setScreen=function()
{
	translate(this.ox,this.oy);
	scale(this.zoom);
}
/**
 *
 * 현재 이동, 스케일링 상태의 마우스 위치를 반환하는 함수
 * 
 * @return {p5.Vector} res	상대적 마우스 위치
 *
 */
SCREEN_CONTROL.prototype.relativeMouse=function()
{
	var res=createVector((mouseX-this.ox)/this.zoom,(mouseY-this.oy)/this.zoom);
	return res;
}
